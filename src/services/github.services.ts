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

// Helper function to fetch data from GitHub API with proper error handling and rate limit management. This function will be used to make API calls to GitHub, ensuring that we handle authentication, rate limits, and errors gracefully.
async function githubFetch(endpoint: string, customAccept?: string) {
  const headers: Record<string, string> = {
    Accept: customAccept || "application/vnd.github.v3+json",
    "User-Agent": "repoX",
  };
  if (config.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${config.GITHUB_TOKEN}`;
  }
  const response = await fetch(`https://api.github.com${endpoint}`, {
    headers,
  });
  if (response.status === 403) {
    const resetTs = parseInt(
      response.headers.get("X-RateLimit-Reset") || "0",
      10,
    );
    const wait = Math.max(0, resetTs - Math.floor(Date.now() / 1000));
    throw new Error(
      `GitHub API rate limit exceeded. Resets in ${wait}s. Set GITHUB_TOKEN in .env.`,
    );
  }
  if (!response.ok) {
    throw new Error(`GitHub resource not found or error: ${endpoint}`);
  }

  return response.json();
}

//fetching the metadata and topic of the repos before feeding to ai

export const fetchRepoMetadata = async (owner: string, repo: string) => {
  const data = await githubFetch(`/repos/${owner}/${repo}`);

  let topics: string[] = [];
  try {
    const topicsData = await githubFetch(
      `/repos/${owner}/${repo}/topics`,
      "application/vnd.github.mercy-preview+json",
    );
    topics = topicsData.names || [];
  } catch (e) {
    console.warn("Could not fetch topics");
  }
  return {
    owner,
    repo,
    full_name: data.full_name || `${owner}/${repo}`,
    description: data.description || "",
    stars: data.stargazers_count || 0,
    language: data.language || "Unknown",
    topics,
    default_branch: data.default_branch || "main",
  };
};

//fetching the file tree of the repo and filtering out irrelevant files based on our defined criteria, such as file type, size, and directory. This function will return a list of files that are relevant for code analysis, prioritizing important files and excluding those that are not useful for our purposes.

export const fetchRepoTree = async (
  owner: string,
  repo: string,
  defaultBranch: string,
) => {
  const treeData = await githubFetch(
    `/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
  );
  const items = treeData.tree || [];

  return items.filter((item: any) => {
    if (item.type === "tree") return false; // Skip directories

    const parts = item.path.split("/");
    if (parts.some((part: string) => EXCLUDED_DIRS.has(part))) return false;

    const lowerPath = item.path.toLowerCase();
    if (Array.from(EXCLUDED_EXTENSIONS).some((ext) => lowerPath.endsWith(ext)))
      return false;

    return true;
  });
};

export const fetchFileContent = async (
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> => {
  try {
    const data = await githubFetch(`/repo/${owner}/${repo}/contents/${path}`);
    //This path is a folder, not a file" We skip it.Because embeddings require TEXT files.
    //because folders do not contain code directly.
    //If path is DIRECTORY/FOLDER
    // Example:
    // path = "src"
    // GitHub returns:

    // [
    //   { "name": "server.ts" },
    //   { "name": "routes" },
    //   { "name": "controllers" }
    // ] thats why return null as these we cant do embedding here

    if (Array.isArray(data)) return null;
    if (data.size() > 50 * 1024) return null; //skip 50 kb file as it dont contain any code only contain the directery file
    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8"); //decode base 64 to std text as github returns encoded text in base 64 as it easy to transfer the files in this format so decode it for reading
    }
    if (data.encoding === "none") return null; //Some files:images,binaries,unsupported files may have:"encoding": "none" These cannot become readable text.So skip them
    return data.content || null;
  } catch (error) {
    console.debug(`Skipped fetching  ${path}`, (error as Error).message);
    return null;
  }
};
