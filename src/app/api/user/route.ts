import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateUserSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.technicalLevel !== undefined)
    updates.technicalLevel = parsed.data.technicalLevel;
  if (parsed.data.onboardingCompleted !== undefined)
    updates.onboardingCompleted = parsed.data.onboardingCompleted;

  if (Object.keys(updates).length > 0) {
    updates.updatedAt = new Date();
    await db.update(user).set(updates).where(eq(user.id, session.user.id));
  }

  return NextResponse.json({ success: true });
}
