import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceGithubInstallations } from "@/lib/db/schema";
import { getMembership } from "@/lib/auth/membership";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");

  const parsedInstallationId = installationId ? Number(installationId) : NaN;

  if (setupAction === "install" && !Number.isNaN(parsedInstallationId)) {
    // Read the workspace cookie set by ConnectRepo before opening GitHub
    const workspaceId = request.cookies.get("github_install_workspace")?.value;

    if (workspaceId) {
      try {
        const session = await auth.api.getSession({
          headers: await headers(),
        });

        if (session) {
          const membership = await getMembership(
            session.user.id,
            workspaceId
          );

          // Only admins/superadmins can link installations
          if (membership && membership.role !== "user") {
            await db
              .insert(workspaceGithubInstallations)
              .values({
                workspaceId,
                githubInstallationId: parsedInstallationId,
              })
              .onConflictDoNothing();
          }
        }
      } catch (err) {
        console.error("Failed to link GitHub installation to workspace:", err);
      }

      // Clear the cookie and redirect back to the workspace
      const redirectUrl = new URL(`/workspace/${workspaceId}`, request.url);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete("github_install_workspace");
      return response;
    }

    // Fallback: no workspace cookie — redirect to home
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
