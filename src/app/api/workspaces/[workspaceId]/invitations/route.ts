import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  workspaceInvitations,
  workspaces,
  user,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getResend } from "@/lib/email/client";
import { invitationEmailHtml } from "@/lib/email/templates/invitation";
import { createInvitationSchema } from "@/lib/validations";
import { getMembership } from "@/lib/auth/membership";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership || membership.role === "user") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const invitations = await db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      status: workspaceInvitations.status,
      createdAt: workspaceInvitations.createdAt,
      invitedByName: user.name,
    })
    .from(workspaceInvitations)
    .innerJoin(user, eq(workspaceInvitations.invitedById, user.id))
    .where(eq(workspaceInvitations.workspaceId, workspaceId));

  return NextResponse.json(invitations);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership || membership.role === "user") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createInvitationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, role } = parsed.data;

  // Get workspace name
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const [invitation] = await db
    .insert(workspaceInvitations)
    .values({
      workspaceId,
      email: email.toLowerCase().trim(),
      invitedById: session.user.id,
      role,
      expiresAt,
    })
    .returning();

  // Send invitation email
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invitations`;

  try {
    const result = await getResend().emails.send({
      from: "Jakoniko <noreply@jakoniko.com>",
      to: email,
      subject: `You've been invited to ${workspace.name} on Jakoniko`,
      html: invitationEmailHtml({
        workspaceName: workspace.name,
        invitedByName: session.user.name,
        inviteUrl,
      }),
    });

    if (result.error) {
      console.error("Resend API error:", result.error);
      return NextResponse.json(
        { ...invitation, emailWarning: "Invitation created but the email could not be sent." },
        { status: 201 }
      );
    }
  } catch (err) {
    console.error("Failed to send invitation email:", err);
    return NextResponse.json(
      { ...invitation, emailWarning: "Invitation created but the email could not be sent." },
      { status: 201 }
    );
  }

  return NextResponse.json(invitation, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await params;
  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership || membership.role === "user") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { invitationId } = await request.json();
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
  }

  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.id, invitationId),
        eq(workspaceInvitations.workspaceId, workspaceId),
        eq(workspaceInvitations.status, "pending")
      )
    );

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  await db
    .delete(workspaceInvitations)
    .where(eq(workspaceInvitations.id, invitationId));

  return NextResponse.json({ success: true });
}
