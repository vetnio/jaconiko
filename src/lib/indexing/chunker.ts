export interface CodeChunk {
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string | null;
}

const MAX_CHUNK_LINES = 200;

export function chunkFile(
  filePath: string,
  content: string,
  language: string | null
): CodeChunk[] {
  const lines = content.split("\n");

  // Small files: keep as single chunk
  if (lines.length <= MAX_CHUNK_LINES) {
    return [
      {
        filePath,
        content,
        startLine: 1,
        endLine: lines.length,
        language,
      },
    ];
  }

  const chunks: CodeChunk[] = [];
  let currentStart = 0;

  while (currentStart < lines.length) {
    let currentEnd = Math.min(currentStart + MAX_CHUNK_LINES, lines.length);

    // Try to find a good break point (blank line between functions/classes)
    if (currentEnd < lines.length) {
      let bestBreak = currentEnd;

      // Look backwards from the target end for a blank line
      for (let i = currentEnd; i > currentStart + MAX_CHUNK_LINES * 0.5; i--) {
        const line = lines[i]?.trim();
        if (line === "" || line === undefined) {
          // Check if the next non-empty line looks like a function/class start
          const nextLine = lines[i + 1]?.trim();
          if (
            nextLine &&
            (nextLine.startsWith("function ") ||
              nextLine.startsWith("export ") ||
              nextLine.startsWith("class ") ||
              nextLine.startsWith("def ") ||
              nextLine.startsWith("async ") ||
              nextLine.startsWith("pub ") ||
              nextLine.startsWith("fn ") ||
              nextLine.startsWith("func ") ||
              nextLine.startsWith("const ") ||
              nextLine.startsWith("type ") ||
              nextLine.startsWith("interface ") ||
              nextLine.startsWith("//") ||
              nextLine.startsWith("#") ||
              nextLine.startsWith("/*"))
          ) {
            bestBreak = i + 1;
            break;
          }
          // Even a blank line is a decent break point
          bestBreak = i + 1;
          break;
        }
      }

      currentEnd = bestBreak;
    }

    const chunkLines = lines.slice(currentStart, currentEnd);
    const chunkContent = chunkLines.join("\n").trim();

    if (chunkContent.length > 0) {
      chunks.push({
        filePath,
        content: chunkContent,
        startLine: currentStart + 1,
        endLine: currentEnd,
        language,
      });
    }

    currentStart = currentEnd;
  }

  return chunks;
}
