import { Router } from "express";
import { Request, Response } from "express";
import {
  parseGitHubRepoUrl,
  fetchRepoMetadata,
} from "../services/github.services";

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
