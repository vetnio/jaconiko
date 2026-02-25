import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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
