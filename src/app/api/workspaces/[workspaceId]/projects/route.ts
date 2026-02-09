import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { runFullIndex } from "@/lib/indexing/orchestrator";
import { createProjectSchema, deleteProjectSchema } from "@/lib/validations";
import { getMembership } from "@/lib/auth/membership";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const projectList = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

  return NextResponse.json(projectList);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership || membership.role === "user") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { githubRepoId, githubRepoFullName, githubInstallationId, defaultBranch } =
    parsed.data;

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId,
      githubRepoId,
      githubRepoFullName,
      githubInstallationId,
      defaultBranch,
    })
    .returning();

  // Fire-and-forget: start indexing immediately
  runFullIndex(
    project.id,
    githubInstallationId,
    githubRepoFullName,
    defaultBranch
  ).catch((err) => console.error("Background indexing failed:", err));

  return NextResponse.json(project, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership || membership.role === "user") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = deleteProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  await db
    .delete(projects)
    .where(and(eq(projects.id, parsed.data.projectId), eq(projects.workspaceId, workspaceId)));

  return NextResponse.json({ success: true });
}
