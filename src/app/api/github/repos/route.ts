import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workspaceGithubInstallations } from "@/lib/db/schema";
import { getMembership } from "@/lib/auth/membership";
import { eq } from "drizzle-orm";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId query param is required" },
      { status: 400 }
    );
  }

  const membership = await getMembership(session.user.id, workspaceId);
  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  try {
    // Only fetch installations authorized for this workspace
    const authorizedInstallations = await db
      .select()
      .from(workspaceGithubInstallations)
      .where(eq(workspaceGithubInstallations.workspaceId, workspaceId));

    if (authorizedInstallations.length === 0) {
      return NextResponse.json([]);
    }

    const allowedInstallationIds = new Set(
      authorizedInstallations.map((i) => i.githubInstallationId)
    );

    const appAuth = createAppAuth({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    });

    const allRepos: Array<{
      id: number;
      full_name: string;
      default_branch: string;
      installationId: number;
    }> = [];

    for (const installationId of allowedInstallationIds) {
      const installationAuth = await appAuth({
        type: "installation",
        installationId,
      });

      const installationOctokit = new Octokit({
        auth: installationAuth.token,
      });

      const { data } =
        await installationOctokit.apps.listReposAccessibleToInstallation({
          per_page: 100,
        });

      for (const repo of data.repositories) {
        allRepos.push({
          id: repo.id,
          full_name: repo.full_name,
          default_branch: repo.default_branch || "main",
          installationId,
        });
      }
    }

    return NextResponse.json(allRepos);
  } catch (err) {
    console.error("Failed to list GitHub repos:", err);
    return NextResponse.json(
      { error: "Failed to fetch repositories from GitHub" },
      { status: 502 }
    );
  }
}
