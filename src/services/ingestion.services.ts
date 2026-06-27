//this file controls the ENTIRE ingestion pipeline
//Project Manager of the AI pipeline

// This file does NOT do heavy work itself.
// Instead it:

// calls other services
// manages flow
// tracks progress
// handles failures
// streams live updates to frontend by SSE (Server-Sent Events)

// This is why it is called: ORCHESTRATOR

//output of gen fuctions is a stream of events that are sent to the frontend via SSE

import {
  parseGitHubRepoUrl,
  fetchRepoMetadata,
  fetchRepoTree,
  fetchFileContent,
} from "./github.services";
import { chunkText, CodeChunk } from "../utils/chunking";
import { ingestRepoToDb } from "./vector.services";

export async function* ingestRepoGenerator(repoUrl: string) {
  //parse Url and yield the progress to frontend
  yield {
    type: "progress",
    step: "parsing",
    message: "Parsing repository Url...",
    progress: 2,
  };
  let owner: string, repo: string;
  try {
    const parsed = parseGitHubRepoUrl(repoUrl);
    owner = parsed.owner;
    repo = parsed.repo;
  } catch (error) {
    yield {
      type: "error",
      step: "parsing",
      message: (error as Error).message,
      progress: 0,
    };
    return;
  }
  const repoName = `${owner}/${repo}`;
  //step 2 fetch metadata of the repo and also sent to fronted which file is fetching and what is current progress report
  yield {
    type: "progress",
    step: "fetching_metadata",
    message: `Fetching metadata for ${repoName}...`,
    progress: 8,
  };

  let metadata;
  try {
  } catch (error) {}
}
