import { getAuthenticatedOctokit } from "@/lib/github/app";

interface RepoFile {
  path: string;
  content: string;
}

export async function fetchRepoTree(
  installationId: number,
  repoFullName: string,
  branch: string
): Promise<string[]> {
  const octokit = await getAuthenticatedOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "1",
  });

  if (!data.tree) {
    console.error(`fetchRepoTree: no tree returned for ${repoFullName}@${branch}`);
    return [];
  }

  return data.tree
    .filter((item) => item.type === "blob" && item.path)
    .map((item) => item.path!);
}

export async function fetchFileContent(
  installationId: number,
  repoFullName: string,
  branch: string,
  filePath: string
): Promise<string | null> {
  const octokit = await getAuthenticatedOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch,
    });

    if ("content" in data && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }

    return null;
  } catch (err) {
    console.error(`fetchFileContent failed for ${repoFullName}:${filePath}@${branch}`, err);
    return null;
  }
}

export async function fetchMultipleFiles(
  installationId: number,
  repoFullName: string,
  branch: string,
  filePaths: string[]
): Promise<RepoFile[]> {
  const results: RepoFile[] = [];

  // Fetch in batches of 10 to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (path) => {
        const content = await fetchFileContent(
          installationId,
          repoFullName,
          branch,
          path
        );
        return content ? { path, content } : null;
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }
  }

  return results;
}
