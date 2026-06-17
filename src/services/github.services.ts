import { error } from "node:console";

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
