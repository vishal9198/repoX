import { Router } from "express";
import { Request, Response } from "express";
import { parseGitHubRepoUrl } from "../services/github.services";

export const analyzeRepoController = (req: Request, res: Response) => {
  try {
    const { repoUrl } = req.body;

    const parsedRepo = parseGitHubRepoUrl(repoUrl);

    res.json({
      success: true,
      data: parsedRepo,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong",
    });
  }
};
