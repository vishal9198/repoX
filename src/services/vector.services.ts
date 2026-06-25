import { ChromaClient } from "chromadb";
import { config } from "../config";
import { CodeChunk } from "../utils/chunking";
import { getEmbeddingFunction } from "./embedding";

const COLLECTION_NAME = "github_repos";

// Initialize ChromaDB Client
const client = new ChromaClient({
  path: `http://${config.CHROMA_HOST}:${config.CHROMA_PORT}`,
});

export const getOrCreateCollection = async () => {
  const embeddingFunction = await getEmbeddingFunction();
  return await client.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction,
    metadata: { "hnsw:space": "cosine" }, // Use cosine similarity for math comparisons
  });
};

export const deleteRepoFromDb = async (repoName: string) => {
  const collection = await getOrCreateCollection();
  try {
    const results = await collection.get({
      where: { repo_name: { $eq: repoName } },
    });
    if (results.ids.length > 0) {
      await collection.delete({ ids: results.ids });
      console.log(`Deleted ${results.ids.length} old chunks for ${repoName}`);
    }
  } catch (error) {
    console.error(`Failed to delete repo ${repoName}:`, error);
  }
};

export const ingestRepoToDb = async (repoName: string, chunks: CodeChunk[]) => {
  if (chunks.length === 0) return 0;

  const collection = await getOrCreateCollection();

  // Wipe old data if re-ingesting the same repo
  await deleteRepoFromDb(repoName);

  const ids: string[] = [];
  const documents: string[] = [];
  const metadatas: any[] = [];

  for (const chunk of chunks) {
    //process each chunk and prepare for inserting into the database
    // Create a unique ID string: "owner/repo::src/main.ts::0"
    const safeId =
      `${repoName}::${chunk.filePath}::${chunk.chunkIndex}`.replace(/\s/g, "_");
    ids.push(safeId);
    documents.push(chunk.text);
    metadatas.push({
      repo_name: repoName,
      file_path: chunk.filePath,
      chunk_index: chunk.chunkIndex,
    });
  }

  // Insert into ChromaDB in batches of 100 to avoid crashing the memory
  const BATCH_SIZE = 100; // take 100 chunks at a time insert them into the database after embedding them internally
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    await collection.upsert({
      ids: ids.slice(i, i + BATCH_SIZE),
      documents: documents.slice(i, i + BATCH_SIZE),
      metadatas: metadatas.slice(i, i + BATCH_SIZE),
    });
  }

  console.log(`Successfully stored ${ids.length} chunks for ${repoName}`);
  return ids.length;
};
