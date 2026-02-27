import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dashboards, dashboardBookmarks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bookmarks = await db
    .select({
      id: dashboards.id,
      title: dashboards.title,
      createdAt: dashboards.createdAt,
      projectId: dashboards.projectId,
      bookmarkedAt: dashboardBookmarks.createdAt,
    })
    .from(dashboardBookmarks)
    .innerJoin(dashboards, eq(dashboardBookmarks.dashboardId, dashboards.id))
    .where(eq(dashboardBookmarks.userId, session.user.id));

  return NextResponse.json(bookmarks);
}
