import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { runFullIndex } from "@/lib/indexing/orchestrator";
import { getMembership } from "@/lib/auth/membership";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId, projectId } = await params;

  // Verify admin+ membership
  const membership = await getMembership(session.user.id, workspaceId);

  if (!membership || membership.role === "user") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 }
    );
  }

  // Verify project belongs to workspace
  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId))
    );

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fire-and-forget reindex
  runFullIndex(
    project.id,
    project.githubInstallationId,
    project.githubRepoFullName,
    project.defaultBranch
  ).catch((err) => console.error("Reindex failed:", err));

  return NextResponse.json({ success: true });
}
