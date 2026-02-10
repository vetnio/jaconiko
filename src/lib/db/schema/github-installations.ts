import {
  pgTable,
  uuid,
  bigint,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const workspaceGithubInstallations = pgTable(
  "workspace_github_installations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    githubInstallationId: bigint("github_installation_id", {
      mode: "number",
    }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("workspace_github_installations_unique_idx").on(
      table.workspaceId,
      table.githubInstallationId
    ),
  ]
);
