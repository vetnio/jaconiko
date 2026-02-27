import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets } from "@/lib/db/schema";
import { updateDashboardSchema } from "@/lib/validations";
import { eq, asc, and, notInArray } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dashboardId } = await params;

  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, dashboardId));

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  if (dashboard.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const widgets = await db
    .select()
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.dashboardId, dashboardId))
    .orderBy(asc(dashboardWidgets.position));

  return NextResponse.json({ ...dashboard, widgets });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dashboardId } = await params;

  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, dashboardId));

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  if (dashboard.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateDashboardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, widgets } = parsed.data;

  const result = await db.transaction(async (tx) => {
    // Update dashboard title if provided
    if (title) {
      await tx
        .update(dashboards)
        .set({ title, updatedAt: new Date() })
        .where(eq(dashboards.id, dashboardId));
    }

    // Update widgets if provided
    if (widgets) {
      // Separate existing widgets (with id) from new widgets (without id)
      const existingWidgets = widgets.filter((w) => w.id);
      const newWidgets = widgets.filter((w) => !w.id);
      const keepIds = existingWidgets.map((w) => w.id!);

      // Delete widgets that are no longer in the list
      if (keepIds.length > 0) {
        await tx
          .delete(dashboardWidgets)
          .where(
            and(
              eq(dashboardWidgets.dashboardId, dashboardId),
              notInArray(dashboardWidgets.id, keepIds)
            )
          );
      } else {
        // No existing widgets to keep — delete all
        await tx
          .delete(dashboardWidgets)
          .where(eq(dashboardWidgets.dashboardId, dashboardId));
      }

      // Update existing widgets
      for (const widget of existingWidgets) {
        await tx
          .update(dashboardWidgets)
          .set({
            type: widget.type as "chart_bar" | "chart_line" | "chart_pie" | "data_table" | "stat_kpi",
            title: widget.title,
            config: widget.config ?? null,
            data: widget.data ?? null,
            position: widget.position,
          })
          .where(eq(dashboardWidgets.id, widget.id!));
      }

      // Insert new widgets
      if (newWidgets.length > 0) {
        await tx.insert(dashboardWidgets).values(
          newWidgets.map((widget) => ({
            dashboardId,
            type: widget.type as "chart_bar" | "chart_line" | "chart_pie" | "data_table" | "stat_kpi",
            title: widget.title,
            config: widget.config ?? null,
            data: widget.data ?? null,
            position: widget.position,
          }))
        );
      }

      // Update dashboard updatedAt
      await tx
        .update(dashboards)
        .set({ updatedAt: new Date() })
        .where(eq(dashboards.id, dashboardId));
    }

    // Return updated dashboard with widgets
    const [updated] = await tx
      .select()
      .from(dashboards)
      .where(eq(dashboards.id, dashboardId));

    const updatedWidgets = await tx
      .select()
      .from(dashboardWidgets)
      .where(eq(dashboardWidgets.dashboardId, dashboardId))
      .orderBy(asc(dashboardWidgets.position));

    return { ...updated, widgets: updatedWidgets };
  });

  return NextResponse.json(result);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ dashboardId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { dashboardId } = await params;

  const [dashboard] = await db
    .select()
    .from(dashboards)
    .where(eq(dashboards.id, dashboardId));

  if (!dashboard) {
    return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
  }

  if (dashboard.userId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Cascade delete will remove widgets and bookmarks
  await db.delete(dashboards).where(eq(dashboards.id, dashboardId));

  return NextResponse.json({ success: true });
}
