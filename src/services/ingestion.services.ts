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
    metadata = await fetchRepoMetadata(owner, repo);
    yield {
      type: "progress",
      step: "metadata_fetched",
      message: `Repository: ${metadata.description || "No description"}`,
      progress: 15,
      metadata,
    };
  } catch (error) {
    yield {
      type: "error",
      step: "fetching_metadata",
      message: `Failed to fetch metadata: ${(error as Error).message}`,
      progress: 0,
    };
    return;
  }
  // fetching the tree structure of the repo so that we can loop over the folders and files and fetch the content of each file and then chunk the content and then send to vector.services.ts to ingest into the database

  yield {
    type: "progress",
    step: "fetching_tree",
    message: "Fetching repository file tree...",
    progress: 20,
  };
  let tree;
  try {
    tree = await fetchRepoTree(owner, repo, metadata.default_branch);
    yield {
      type: "ptogress",
      step: "fetching_tree",
      message: `Found ${tree.length}ctitical files`,
      progress: 30,
    };
  } catch (error) {
    yield {
      type: "error",
      step: "fetching_tree",
      message: `Failed to fetch file tree: ${(error as Error).message}`,
      progress: 0,
    };
    return;
  }
  // Step 4: Fetch File Contents
  // Note: We cap it at 50 files to prevent hitting rate limits although there is many files but we only fetch 50 most imp files most of the logic of code is there
  const selectedFiles = tree.slices(0, 50);
  const totalFiles = selectedFiles.length;
  yield {
    type: "progress",
    step: "fetching_files",
    message: `Fetching content of ${totalFiles} key files...`,
    progress: 35,
  };
  const fileContents: { path: string; content: string }[] = [];
  let failed = 0;

  for (let i = 0; i < totalFiles; i++) {
    const fileItem = selectedFiles[i];
    const progress = Math.floor(35 + (i / Math.max(totalFiles, 1)) * 30); // Scales from 35 to 65
    if (i % 5 === 0) {
      yield {
        type: "progress",
        step: "fetching_files",
        message: `Fetching ${i + 1}/${totalFiles}: ${fileItem.path}`,
        progress,
      };
    }
    const content = await fetchFileContent(owner, repo, fileItem.path);
    if (content) {
      fileContents.push({ path: fileItem.path, content });
    } else {
      failed++;
    }
  }
  yield {
    type: "progress",
    step: "files_fetched",
    message: `Fetched ${fileContents.length} files (${failed} skipped)`,
    progress: 65,
  };
  if (fileContents.length === 0) {
    yield {
      type: "error",
      step: "files_fetched",
      message:
        "No file content could be fetched. Is it a public text-based repo?",
      progress: 0,
    };
    return;
  }
  //step 5 chunk the text since file content have all the files with actual code content now need of to chunk the contents
  yield {
    type: "progress",
    step: "chunking",
    message: "Chunking file content...",
    progress: 70,
  };
  const allChunks: CodeChunk[] = [];
  for (const file of fileContents) {
    const chunks = chunkText(file.content, file.path);
    allChunks.push(...chunks);
  }
  yield {
    type: "progress",
    step: "chunking_done",
    message: `Created ${allChunks.length} chunks from ${fileContents.length} files`,
    progress: 75,
  };
  // Step 6: Embed and Store in ChromaDB
  yield {
    type: "progress",
    step: "embedding",
    message: `Embedding ${allChunks.length} chunks... This may take a moment.`,
    progress: 78,
  };
  let stored = 0;
  try {
    stored = await ingestRepoToDb(repoName, allChunks);
    yield {
      type: "progress",
      step: "storing",
      message: `Stored ${stored} chunks in ChromaDB`,
      progress: 95,
    };
  } catch (error) {
    yield {
      type: "error",
      step: "embedding",
      message: `Failed to embed/store: ${(error as Error).message}`,
      progress: 0,
    };
    return;
  }

  // Step 7: Done!
  yield {
    type: "complete",
    step: "done",
    message: `Successfully indexed ${repoName}! Ready for chat.`,
    progress: 100,
    repo_name: repoName,
    chunk_count: stored,
    file_count: fileContents.length,
    metadata,
  };
}
