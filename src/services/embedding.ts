import { pipeline } from "@xenova/transformers";

let embedder: any = null;

export async function getEmbeddingFunction() {
  // Load model only once
  if (embedder === null) {
    console.log("loading embedding model");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }

  // Function to convert text into vectors
  async function generate(texts: string[]) {
    const output = await embedder(texts, {
      pooling: "mean",
      normalize: true,
    });

    return output.tolist();
  }

  return {
    generate,
  };
}
