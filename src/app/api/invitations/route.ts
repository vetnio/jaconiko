import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workspaceInvitations,
  workspaces,
  workspaceMembers,
  user,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { handleInvitationSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email.toLowerCase();

  const invitations = await db
    .select({
      id: workspaceInvitations.id,
      workspaceId: workspaceInvitations.workspaceId,
      workspaceName: workspaces.name,
      invitedByName: user.name,
      role: workspaceInvitations.role,
    })
    .from(workspaceInvitations)
    .innerJoin(
      workspaces,
      eq(workspaceInvitations.workspaceId, workspaces.id)
    )
    .innerJoin(user, eq(workspaceInvitations.invitedById, user.id))
    .where(
      and(
        eq(workspaceInvitations.email, userEmail),
        eq(workspaceInvitations.status, "pending")
      )
    );

  return NextResponse.json(invitations);
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = handleInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { invitationId, action } = parsed.data;
  const userEmail = session.user.email.toLowerCase();

  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.id, invitationId),
        eq(workspaceInvitations.email, userEmail),
        eq(workspaceInvitations.status, "pending")
      )
    );

  if (!invitation) {
    return NextResponse.json(
      { error: "Invitation not found" },
      { status: 404 }
    );
  }

  // Check if invitation has expired
  if (new Date() > invitation.expiresAt) {
    return NextResponse.json(
      { error: "Invitation has expired" },
      { status: 410 }
    );
  }

  if (action === "accept") {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(workspaceMembers).values({
          workspaceId: invitation.workspaceId,
          userId: session.user.id,
          role: invitation.role === "admin" ? "admin" : "user",
        }).onConflictDoNothing();

        await tx
          .update(workspaceInvitations)
          .set({ status: "accepted" })
          .where(eq(workspaceInvitations.id, invitationId));
      });
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      return NextResponse.json(
        { error: "Failed to accept invitation. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspaceId: invitation.workspaceId });
  }

  // Decline
  await db
    .update(workspaceInvitations)
    .set({ status: "declined" })
    .where(eq(workspaceInvitations.id, invitationId));

  return NextResponse.json({ success: true });
}
