export interface CodeChunk {
  text: string;
  filePath: string;
  chunkIndex: number;
}

export function chunkText(text: string, filePath: string): CodeChunk[] {
  const LINES_PER_CHUNK = 100;
  const OVERLAP_LINES = 10;
  const lines = text.split("\n");

  if (lines.length == 0) return [];

  const chunks: CodeChunk[] = [];

  let start = 0;
  let chunkIndex = 0;
  while (start < lines.length) {
    const end = Math.min(start + LINES_PER_CHUNK, lines.length);
    const chunkLines = lines.slice(start, end);
    const chunkTextStr = chunkLines.join("\n").trim();

    if (chunkTextStr.length > 0) {
      const header = `# File: ${filePath}\n`;
      chunks.push({
        text: header + chunkTextStr,
        filePath,
        chunkIndex,
      });
    }
    chunkIndex++;

    if (end >= lines.length) break;
    start = end - OVERLAP_LINES;
  }
  return chunks;
}
