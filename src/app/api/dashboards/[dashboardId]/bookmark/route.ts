import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardBookmarks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
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

  await db
    .insert(dashboardBookmarks)
    .values({
      dashboardId,
      userId: session.user.id,
    })
    .onConflictDoNothing();

  return NextResponse.json({ success: true }, { status: 201 });
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

  await db
    .delete(dashboardBookmarks)
    .where(
      and(
        eq(dashboardBookmarks.dashboardId, dashboardId),
        eq(dashboardBookmarks.userId, session.user.id)
      )
    );

  return NextResponse.json({ success: true });
}
