import { db } from "@/lib/db";
import { codeChunks } from "@/lib/db/schema";
import { eq, sql, cosineDistance, desc } from "drizzle-orm";
import { embedQuery } from "@/lib/indexing/embedder";

export interface RetrievedChunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string | null;
  similarity: number;
}

export async function retrieveRelevantChunks(
  projectId: string,
  query: string,
  topK: number = 20
): Promise<RetrievedChunk[]> {
  // Embed the query
  const queryEmbedding = await embedQuery(query);

  const similarity = sql<number>`1 - (${cosineDistance(codeChunks.embedding, queryEmbedding)})`;

  const results = await db
    .select({
      id: codeChunks.id,
      filePath: codeChunks.filePath,
      content: codeChunks.content,
      startLine: codeChunks.startLine,
      endLine: codeChunks.endLine,
      language: codeChunks.language,
      similarity,
    })
    .from(codeChunks)
    .where(eq(codeChunks.projectId, projectId))
    .orderBy(desc(similarity))
    .limit(topK);

  // De-duplicate: if multiple chunks from same file are adjacent, keep them
  const seen = new Set<string>();
  const deduped: RetrievedChunk[] = [];

  for (const result of results) {
    const key = `${result.filePath}:${result.startLine}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }

  return deduped;
}
