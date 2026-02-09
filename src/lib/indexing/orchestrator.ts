import { db } from "@/lib/db";
import { codeChunks, projects } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fetchRepoTree, fetchMultipleFiles } from "./fetcher";
import { shouldIndexFile, detectLanguage } from "./filter";
import { chunkFile } from "./chunker";
import { embedTexts } from "./embedder";

export async function runFullIndex(
  projectId: string,
  installationId: number,
  repoFullName: string,
  branch: string
) {
  try {
    // Mark as indexing
    await db
      .update(projects)
      .set({ indexingStatus: "indexing", indexingProgress: 0 })
      .where(eq(projects.id, projectId));

    // 1. Fetch repo tree
    const allFiles = await fetchRepoTree(installationId, repoFullName, branch);
    const filesToIndex = allFiles.filter(shouldIndexFile);

    if (filesToIndex.length === 0) {
      await db
        .update(projects)
        .set({
          indexingStatus: "ready",
          indexingProgress: 100,
          lastIndexedAt: new Date(),
        })
        .where(eq(projects.id, projectId));
      return;
    }

    // 2. Delete existing chunks
    await db.delete(codeChunks).where(eq(codeChunks.projectId, projectId));

    // 3. Process files in batches
    const batchSize = 20;
    let processedFiles = 0;

    for (let i = 0; i < filesToIndex.length; i += batchSize) {
      const batch = filesToIndex.slice(i, i + batchSize);

      // Fetch file contents
      const files = await fetchMultipleFiles(
        installationId,
        repoFullName,
        branch,
        batch
      );

      // Chunk files
      const allChunks = files.flatMap((file) =>
        chunkFile(file.path, file.content, detectLanguage(file.path))
      );

      if (allChunks.length > 0) {
        // Generate embeddings
        const texts = allChunks.map(
          (chunk) => `${chunk.filePath}\n\n${chunk.content}`
        );
        const embeddings = await embedTexts(texts);

        // Store chunks with embeddings
        await db.insert(codeChunks).values(
          allChunks.map((chunk, idx) => ({
            projectId,
            filePath: chunk.filePath,
            content: chunk.content,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            language: chunk.language,
            embedding: embeddings[idx],
          }))
        );
      }

      processedFiles += batch.length;
      const progress = Math.round((processedFiles / filesToIndex.length) * 100);

      await db
        .update(projects)
        .set({ indexingProgress: progress })
        .where(eq(projects.id, projectId));
    }

    // 4. Mark as ready
    await db
      .update(projects)
      .set({
        indexingStatus: "ready",
        indexingProgress: 100,
        lastIndexedAt: new Date(),
      })
      .where(eq(projects.id, projectId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Full indexing failed for project ${projectId}:`, message);
    await db
      .update(projects)
      .set({ indexingStatus: "failed" })
      .where(eq(projects.id, projectId));
  }
}

export async function runIncrementalIndex(
  projectId: string,
  installationId: number,
  repoFullName: string,
  branch: string,
  changedFiles: string[],
  removedFiles: string[]
) {
  try {
    // Filter to only indexable files
    const filesToProcess = changedFiles.filter(shouldIndexFile);
    const filesToRemove = [...removedFiles, ...filesToProcess];

    if (filesToRemove.length > 0) {
      // Delete old chunks for changed/removed files
      await db
        .delete(codeChunks)
        .where(
          and(
            eq(codeChunks.projectId, projectId),
            inArray(codeChunks.filePath, filesToRemove)
          )
        );
    }

    if (filesToProcess.length === 0) return;

    // Fetch updated file contents
    const files = await fetchMultipleFiles(
      installationId,
      repoFullName,
      branch,
      filesToProcess
    );

    // Chunk and embed
    const allChunks = files.flatMap((file) =>
      chunkFile(file.path, file.content, detectLanguage(file.path))
    );

    if (allChunks.length > 0) {
      const texts = allChunks.map(
        (chunk) => `${chunk.filePath}\n\n${chunk.content}`
      );
      const embeddings = await embedTexts(texts);

      await db.insert(codeChunks).values(
        allChunks.map((chunk, idx) => ({
          projectId,
          filePath: chunk.filePath,
          content: chunk.content,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          language: chunk.language,
          embedding: embeddings[idx],
        }))
      );
    }

    await db
      .update(projects)
      .set({ lastIndexedAt: new Date() })
      .where(eq(projects.id, projectId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Incremental indexing failed for project ${projectId}:`, message);
  }
}
