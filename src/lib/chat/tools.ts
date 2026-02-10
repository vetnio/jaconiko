import { tool } from "ai";
import { z } from "zod";
import { fetchRepoTree, fetchFileContent } from "@/lib/github/fetcher";
import { shouldIndexFile } from "@/lib/github/filter";
import { getAuthenticatedOctokit } from "@/lib/github/app";

interface CreateCodebaseToolsOptions {
  installationId: number;
  repoFullName: string;
  defaultBranch: string;
}

export function createCodebaseTools({
  installationId,
  repoFullName,
  defaultBranch,
}: CreateCodebaseToolsOptions) {
  // Cache the repo tree within the request scope
  let cachedTree: string[] | null = null;

  async function getTree(): Promise<string[]> {
    if (cachedTree) return cachedTree;
    const allFiles = await fetchRepoTree(installationId, repoFullName, defaultBranch);
    cachedTree = allFiles.filter(shouldIndexFile);
    return cachedTree;
  }

  return {
    listFiles: tool({
      description:
        "List files in the repository. Optionally filter by a directory path prefix. Use this to understand the project structure before reading specific files.",
      parameters: z.object({
        path: z
          .string()
          .optional()
          .describe(
            "Optional directory path prefix to filter files (e.g. 'src/lib' or 'src/components')"
          ),
      }),
      execute: async ({ path }) => {
        const tree = await getTree();
        const filtered = path
          ? tree.filter((f) => f.startsWith(path))
          : tree;
        return {
          files: filtered.slice(0, 500),
          totalCount: filtered.length,
          truncated: filtered.length > 500,
        };
      },
    }),

    readFile: tool({
      description:
        "Read the contents of a specific file in the repository. Returns the full file content (truncated at ~100KB). Always use the exact file path from listFiles results.",
      parameters: z.object({
        filePath: z
          .string()
          .describe("The exact file path to read (e.g. 'src/lib/auth.ts')"),
      }),
      execute: async ({ filePath }) => {
        const content = await fetchFileContent(
          installationId,
          repoFullName,
          defaultBranch,
          filePath
        );
        if (content === null) {
          return { error: `File not found: ${filePath}` };
        }
        const maxSize = 100_000;
        if (content.length > maxSize) {
          return {
            content: content.slice(0, maxSize),
            truncated: true,
            totalLength: content.length,
            note: "File was truncated at ~100KB. Ask the user if you need to see more.",
          };
        }
        return { content };
      },
    }),

    searchCode: tool({
      description:
        "Search for code patterns across the repository using GitHub code search. Returns matching file paths and code fragments. Use this to find where specific functions, variables, or patterns are used.",
      parameters: z.object({
        query: z
          .string()
          .describe(
            "Search query (e.g. 'useState' or 'function handleSubmit' or 'import auth')"
          ),
      }),
      execute: async ({ query }) => {
        try {
          const octokit = await getAuthenticatedOctokit(installationId);
          const { data } = await octokit.rest.search.code({
            q: `${query} repo:${repoFullName}`,
            per_page: 20,
          });
          return {
            results: data.items.map((item) => ({
              path: item.path,
              matches: item.text_matches?.map((m) => m.fragment) ?? [],
            })),
            totalCount: data.total_count,
          };
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Search failed";
          // Rate limited or other error - suggest fallback
          return {
            error: message,
            suggestion:
              "Code search is unavailable. Use listFiles to browse the directory structure and readFile to inspect specific files instead.",
          };
        }
      },
    }),
  };
}
