import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Authenticate as the GitHub App
    const appAuth = createAppAuth({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
    });

    const appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
      },
    });

    // List all installations of the GitHub App
    const { data: installations } =
      await appOctokit.apps.listInstallations();

    const allRepos: Array<{
      id: number;
      full_name: string;
      default_branch: string;
      installationId: number;
    }> = [];

    for (const installation of installations) {
      // Get an installation access token
      const installationAuth = await appAuth({
        type: "installation",
        installationId: installation.id,
      });

      const installationOctokit = new Octokit({
        auth: installationAuth.token,
      });

      // List repos accessible to this installation
      const { data } =
        await installationOctokit.apps.listReposAccessibleToInstallation({
          per_page: 100,
        });

      for (const repo of data.repositories) {
        allRepos.push({
          id: repo.id,
          full_name: repo.full_name,
          default_branch: repo.default_branch || "main",
          installationId: installation.id,
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
