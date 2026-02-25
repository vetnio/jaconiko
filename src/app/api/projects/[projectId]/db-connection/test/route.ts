import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getMembership } from "@/lib/auth/membership";
import { testDbConnectionSchema } from "@/lib/validations";
import pg from "pg";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await getMembership(session.user.id, project.workspaceId);
  if (!membership || membership.role === "user") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = testDbConnectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const client = new pg.Client({
    connectionString: parsed.data.connectionString,
    connectionTimeoutMillis: 10000,
    statement_timeout: 5000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    await client.end().catch(() => {});
  }
}
