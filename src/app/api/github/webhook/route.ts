import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/github/webhooks";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { runIncrementalIndex } from "@/lib/indexing/orchestrator";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  const payload = JSON.parse(body);

  if (event === "push") {
    const repoId = payload.repository?.id;
    const installationId = payload.installation?.id;

    if (!repoId) {
      console.warn("GitHub webhook push event missing repository.id");
      return NextResponse.json({ ok: true });
    }

    if (!installationId) {
      console.warn(`GitHub webhook push event missing installation.id for repo ${repoId}`);
    }

    // Find matching project(s)
    const matchingProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.githubRepoId, repoId));

    for (const project of matchingProjects) {
      // Get changed files from push
      const changedFiles: string[] = [];
      for (const commit of payload.commits || []) {
        changedFiles.push(
          ...(commit.added || []),
          ...(commit.modified || []),
          ...(commit.removed || [])
        );
      }

      const uniqueFiles = [...new Set(changedFiles)];
      const removedFiles: string[] = [];
      for (const commit of payload.commits || []) {
        removedFiles.push(...(commit.removed || []));
      }

      // Trigger incremental re-index (fire and forget)
      runIncrementalIndex(
        project.id,
        installationId || project.githubInstallationId,
        project.githubRepoFullName,
        project.defaultBranch,
        uniqueFiles,
        [...new Set(removedFiles)]
      ).catch((err) =>
        console.error("Incremental indexing failed:", err)
      );
    }
  }

  return NextResponse.json({ ok: true });
}
