import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, workspaceGithubInstallations } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { createProjectSchema, deleteProjectSchema } from "@/lib/validations";
import { getMembership, verifyInstallation } from "@/lib/auth/membership";

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

  const authorizedInstallationIds = db
    .select({ id: workspaceGithubInstallations.githubInstallationId })
    .from(workspaceGithubInstallations)
    .where(eq(workspaceGithubInstallations.workspaceId, workspaceId));

  const projectList = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, workspaceId),
        inArray(projects.githubInstallationId, authorizedInstallationIds)
      )
    );

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

  // Verify the GitHub installation is authorized for this workspace
  const installationAuthorized = await verifyInstallation(workspaceId, githubInstallationId);
  if (!installationAuthorized) {
    return NextResponse.json(
      { error: "GitHub installation not authorized for this workspace" },
      { status: 403 }
    );
  }

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
