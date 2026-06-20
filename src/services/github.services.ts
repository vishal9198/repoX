import { error } from "node:console";
import { config } from "../config";

export const parseGitHubRepoUrl = (repoUrl: string) => {
  try {
    const url = new URL(repoUrl);

    if (url.hostname != "github.com") {
      throw new Error("Invalid Github Url");
    }
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      throw new Error("Repo path is invalid ");
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    return {
      owner,
      repo,
    };
  } catch (error) {
    throw new Error("Failed to parse Github Url");
  }
};

//priority files to be analyzed first, we can add more files to this list based on common project structures and important files that often contain critical information about the project.

const PRIORITY_FILES = new Set([
  "README.md",
  "package.json",
  "requirements.txt",
  "docker-compose.yml",
  "Dockerfile",
  "main.py",
  "index.js",
  "index.ts",
  "app.js",
  "app.ts",
  "env.example",
]);

// we can also maintain a list of file extensions and directories to exclude from analysis, as they often contain binary files, dependencies, or build artifacts that are not relevant for code analysis.

const EXCLUDED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".svg",
  ".ico",
  ".pdf",
  ".zip",
  ".tar.gz",
  ".rar",
  ".tar",
  ".lock",
  ".min.js",
  ".map",
  ".exe",
  ".pyc",
  ".bin",
]);

// Exclude common directories that contain dependencies, build artifacts, or version control metadata, as they are not relevant for code analysis and can significantly reduce the number of files to process.

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "__pycache__",
  ".next",
  ".venv",
  "venv",
  ".coverage",
  "site-packages",
]);

// Set a maximum file size limit (e.g., 50 KB) to avoid processing large files that are unlikely to be relevant for code analysis and can consume excessive resources.

const MAX_FILE_SIZE = 50 * 1024; // 50 KB
const MAX_FILES_TO_FETCH = 50; // Limit the number of files to fetch from the repository to avoid overwhelming the system with too much data, especially for large repositories. This can help ensure that the analysis remains efficient and manageable.
async function githubFetch(endpoint: string, customAccept?: string) {
  const header: Record<string, string> = {
    Accept: customAccept || "application/vnd.github.v3+json",
    "User-Agent": "rep",
  };
}
