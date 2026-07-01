import { Router } from "express";
import { Request, Response } from "express";
import {
  parseGitHubRepoUrl,
  fetchRepoMetadata,
} from "../services/github.services";

import { ingestRepoGenerator } from "../services/ingestion.services";

export const analyzeRepoController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { repoUrl } = req.body;

    const parsedRepo = parseGitHubRepoUrl(repoUrl);
    const metadata = await fetchRepoMetadata(parsedRepo.owner, parsedRepo.repo);

    res.json({
      success: true,
      message: "Repository metadata fetched successfully",
      data: metadata,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    });
  }
};

// SSE Controller
// Streams live ingestion progress to frontend in real-time

export const ingestRepoController = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Get repo URL from frontend request body
  const { repoUrl } = req.body;

  // Validation: repo URL required
  if (!repoUrl) {
    res.status(400).json({
      success: false,
      message: "repoUrl is required",
    });
    return;
  }
  //in sse we explicitly set the headers to tell the browser this is a stream and not a normal response

  // Tell browser this is an SSE stream
  res.setHeader("Content-Type", "text/event-stream");

  // Prevent caching of live stream
  res.setHeader("Cache-Control", "no-cache");

  // Keep HTTP connection open for continuous streaming
  res.setHeader("Connection", "keep-alive");

  // Disable proxy buffering (important for Nginx/production)
  res.setHeader("X-Accel-Buffering", "no");

  try {
    // Consume async generator step-by-step as events arrive
    for await (const event of ingestRepoGenerator(repoUrl)) {
      //normal for of loop will not work here because it will wait for the whole generator to finish and then return the result but we want to stream the result as it comes in so we use for await of loop which will wait for each yield to finish and then return the result

      // Send SSE event to frontend
      // SSE format MUST be: data: <message>\n\n
      res.write(`data: ${JSON.stringify(event)}\n\n`);

      // Close stream when ingestion finishes or crashes
      if (event.type === "complete" || event.type === "error") {
        // Close SSE connection
        res.end();

        // Prevent further execution
        return;
      }
    }
  } catch (error) {
    // Handle unexpected stream crash

    console.error("Ingestion stream error:", error);

    // Send error event through SSE stream
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        step: "stream_crash",
        message: "Internal Server Error during stream",
        progress: 0,
      })}\n\n`,
    );

    // Close connection after error
    res.end();
  }
};
