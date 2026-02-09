import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user as userTable, workspaceMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Fetch user's onboardingCompleted from DB (not exposed on session type)
  const [userData] = await db
    .select({ onboardingCompleted: userTable.onboardingCompleted })
    .from(userTable)
    .where(eq(userTable.id, session.user.id));

  // If onboarding not completed, go to invitations/onboarding flow
  if (!userData?.onboardingCompleted) {
    redirect("/invitations");
  }

  // Find user's first workspace
  const [firstMembership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, session.user.id))
    .limit(1);

  if (firstMembership) {
    redirect(`/workspace/${firstMembership.workspaceId}`);
  }

  // No workspace — go to invitations page
  redirect("/invitations");
}
