import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatThreads, projects } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  createThreadSchema,
  updateThreadSchema,
  deleteThreadSchema,
} from "@/lib/validations";
import { getMembership, verifyThreadAccess } from "@/lib/auth/membership";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "projectId is required" },
      { status: 400 }
    );
  }

  // Verify user has access to this project's workspace
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await getMembership(session.user.id, project.workspaceId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const threads = await db
    .select()
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.projectId, projectId),
        eq(chatThreads.userId, session.user.id)
      )
    )
    .orderBy(desc(chatThreads.updatedAt));

  return NextResponse.json(threads);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify user is a member of the project's workspace
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, parsed.data.projectId));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await getMembership(session.user.id, project.workspaceId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const [thread] = await db
    .insert(chatThreads)
    .values({
      projectId: parsed.data.projectId,
      userId: session.user.id,
      title: "New chat",
    })
    .returning();

  return NextResponse.json(thread, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify workspace membership via thread access
  const access = await verifyThreadAccess(session.user.id, parsed.data.threadId);
  if (!access) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  await db
    .update(chatThreads)
    .set({ title: parsed.data.title, updatedAt: new Date() })
    .where(
      and(
        eq(chatThreads.id, parsed.data.threadId),
        eq(chatThreads.userId, session.user.id)
      )
    );

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify workspace membership via thread access
  const access = await verifyThreadAccess(session.user.id, parsed.data.threadId);
  if (!access) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  await db
    .delete(chatThreads)
    .where(
      and(
        eq(chatThreads.id, parsed.data.threadId),
        eq(chatThreads.userId, session.user.id)
      )
    );

  return NextResponse.json({ success: true });
}
