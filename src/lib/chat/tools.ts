import { tool } from "ai";
import { z } from "zod";
import { fetchRepoTree, fetchFileContent } from "@/lib/github/fetcher";
import { shouldIndexFile } from "@/lib/github/filter";
import { getAuthenticatedOctokit } from "@/lib/github/app";
import { queryUserDatabase } from "@/lib/db/user-db";
import { db } from "@/lib/db";
import { dashboards, dashboardWidgets } from "@/lib/db/schema";

interface CreateCodebaseToolsOptions {
  installationId: number;
  repoFullName: string;
  defaultBranch: string;
  dbConnection?: {
    encryptedConnectionString: string;
    iv: string;
  };
  dashboard: {
    projectId: string;
    userId: string;
    workspaceId: string;
    threadId: string;
  };
}

export function createCodebaseTools({
  installationId,
  repoFullName,
  defaultBranch,
  dbConnection,
  dashboard: dashboardCtx,
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

    // Only injected when the project has a DB connection string
    ...(dbConnection
      ? {
          queryDatabase: tool({
            description:
              "Execute a read-only SQL query against the project's connected database. Only SELECT and WITH (CTE) queries are allowed. Use this to answer questions about the application's data, check table contents, run aggregations, or investigate data issues. Always refer to the database schema provided in the system prompt.",
            parameters: z.object({
              query: z
                .string()
                .describe(
                  "A read-only SQL query (SELECT or WITH only). Example: SELECT * FROM users LIMIT 10"
                ),
            }),
            execute: async ({ query }) => {
              try {
                const result = await queryUserDatabase({
                  encryptedConnectionString:
                    dbConnection.encryptedConnectionString,
                  iv: dbConnection.iv,
                  query,
                });
                return {
                  rows: result.rows,
                  rowCount: result.rowCount,
                  columns: result.fields.map((f) => f.name),
                };
              } catch (err: unknown) {
                const message =
                  err instanceof Error ? err.message : "Query failed";
                return { error: message };
              }
            },
          }),
        }
      : {}),

    createDashboard: tool({
      description:
        "Create a data dashboard with charts, tables, and KPI cards. Use this ONLY after gathering real data from the codebase or database using other tools (listFiles, readFile, searchCode, queryDatabase). Never fabricate data — every value in the dashboard must come from actual data you retrieved.",
      parameters: z.object({
        title: z
          .string()
          .describe("A descriptive title for the dashboard"),
        widgets: z
          .array(
            z.object({
              type: z
                .enum([
                  "chart_bar",
                  "chart_line",
                  "chart_pie",
                  "data_table",
                  "stat_kpi",
                ])
                .describe("The widget type"),
              title: z
                .string()
                .describe("A descriptive title for this widget"),
              config: z
                .record(z.unknown())
                .optional()
                .describe(
                  "Optional display config (e.g. axis labels, colors)"
                ),
              data: z
                .record(z.unknown())
                .optional()
                .describe(
                  "The data to display. For charts/tables: { rows: [{...}, ...] }. For stat_kpi: { label, value, trend? }"
                ),
            })
          )
          .describe("Array of widgets to include in the dashboard"),
      }),
      execute: async ({ title, widgets }) => {
        try {
          const [dashboard] = await db
            .insert(dashboards)
            .values({
              projectId: dashboardCtx.projectId,
              userId: dashboardCtx.userId,
              threadId: dashboardCtx.threadId,
              title,
            })
            .returning();

          if (widgets.length > 0) {
            await db.insert(dashboardWidgets).values(
              widgets.map((w, i) => ({
                dashboardId: dashboard.id,
                type: w.type,
                title: w.title,
                config: w.config ?? null,
                data: w.data ?? null,
                position: i,
              }))
            );
          }

          const url = `/workspace/${dashboardCtx.workspaceId}/project/${dashboardCtx.projectId}/dashboard/${dashboard.id}`;

          return {
            dashboardId: dashboard.id,
            url,
            message: `Dashboard "${title}" created with ${widgets.length} widget(s).`,
          };
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Failed to create dashboard";
          return { error: message };
        }
      },
    }),
  };
}
