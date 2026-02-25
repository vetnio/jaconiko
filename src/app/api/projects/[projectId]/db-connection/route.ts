import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMembership } from "@/lib/auth/membership";
import { encrypt } from "@/lib/crypto";
import { saveDbConnectionSchema } from "@/lib/validations";

async function getProjectAndVerifyAdmin(projectId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    return { error: NextResponse.json({ error: "Project not found" }, { status: 404 }) };
  }

  const membership = await getMembership(session.user.id, project.workspaceId);
  if (!membership || membership.role === "user") {
    return { error: NextResponse.json({ error: "Insufficient permissions" }, { status: 403 }) };
  }

  return { project };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const result = await getProjectAndVerifyAdmin(projectId);
  if ("error" in result) return result.error;

  return NextResponse.json({
    isConnected: !!result.project.encryptedDbConnectionString,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const result = await getProjectAndVerifyAdmin(projectId);
  if ("error" in result) return result.error;

  const body = await request.json();
  const parsed = saveDbConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { ciphertext, iv } = encrypt(parsed.data.connectionString);

  await db
    .update(projects)
    .set({
      encryptedDbConnectionString: ciphertext,
      dbConnectionStringIv: iv,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const result = await getProjectAndVerifyAdmin(projectId);
  if ("error" in result) return result.error;

  await db
    .update(projects)
    .set({
      encryptedDbConnectionString: null,
      dbConnectionStringIv: null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  return NextResponse.json({ success: true });
}
