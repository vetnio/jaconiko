import { Octokit } from "@octokit/rest";

export async function createInstallationToken(
  installationId: number
): Promise<string> {
  const { createAppAuth } = await import("@octokit/auth-app");

  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  });

  const installationAuth = await auth({
    type: "installation",
    installationId,
  });

  return installationAuth.token;
}

export async function getAuthenticatedOctokit(
  installationId: number
): Promise<Octokit> {
  const token = await createInstallationToken(installationId);
  return new Octokit({ auth: token });
}
