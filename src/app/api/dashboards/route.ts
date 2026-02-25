import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets, projects } from "@/lib/db/schema";
import { getMembership } from "@/lib/auth/membership";
import { createDashboardSchema } from "@/lib/validations";
import { eq, and, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createDashboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { projectId, threadId, title, widgets } = parsed.data;

  // Verify the project exists and user is a member of its workspace
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

  // Create dashboard with widgets in a transaction
  const result = await db.transaction(async (tx) => {
    const [dashboard] = await tx
      .insert(dashboards)
      .values({
        projectId,
        userId: session.user.id,
        threadId: threadId ?? null,
        title,
      })
      .returning();

    if (widgets.length > 0) {
      await tx.insert(dashboardWidgets).values(
        widgets.map((widget, index) => ({
          dashboardId: dashboard.id,
          type: widget.type as "chart_bar" | "chart_line" | "chart_pie" | "data_table" | "stat_kpi",
          title: widget.title,
          config: widget.config ?? null,
          data: widget.data ?? null,
          position: index,
        }))
      );
    }

    return dashboard;
  });

  return NextResponse.json(result, { status: 201 });
}

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

  // Verify the project exists and user is a member of its workspace
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

  const userDashboards = await db
    .select()
    .from(dashboards)
    .where(
      and(
        eq(dashboards.projectId, projectId),
        eq(dashboards.userId, session.user.id)
      )
    )
    .orderBy(desc(dashboards.createdAt));

  return NextResponse.json(userDashboards);
}
