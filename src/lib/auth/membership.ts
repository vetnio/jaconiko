import { db } from "@/lib/db";
import {
  workspaceMembers,
  chatThreads,
  projects,
  workspaceGithubInstallations,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getMembership(userId: string, workspaceId: string) {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, workspaceId)
      )
    );
  return membership;
}

export async function requireMembership(userId: string, workspaceId: string) {
  const membership = await getMembership(userId, workspaceId);
  if (!membership) return null;
  return membership;
}

export async function verifyInstallation(
  workspaceId: string,
  githubInstallationId: number
) {
  const [row] = await db
    .select()
    .from(workspaceGithubInstallations)
    .where(
      and(
        eq(workspaceGithubInstallations.workspaceId, workspaceId),
        eq(workspaceGithubInstallations.githubInstallationId, githubInstallationId)
      )
    );
  return !!row;
}

/**
 * Verify a user has access to a thread by checking:
 * thread exists + user owns thread + user is a member of the thread's workspace
 * + GitHub installation is still authorized for the workspace
 */
export async function verifyThreadAccess(userId: string, threadId: string) {
  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(
      and(eq(chatThreads.id, threadId), eq(chatThreads.userId, userId))
    );

  if (!thread) return null;

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, thread.projectId));

  if (!project) return null;

  const membership = await getMembership(userId, project.workspaceId);
  if (!membership) return null;

  const installationAuthorized = await verifyInstallation(
    project.workspaceId,
    project.githubInstallationId
  );
  if (!installationAuthorized) return null;

  return { thread, project, membership };
}
