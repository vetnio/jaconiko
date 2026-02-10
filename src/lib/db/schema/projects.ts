import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspaces } from "./workspaces";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  githubRepoId: bigint("github_repo_id", { mode: "number" }).notNull(),
  githubRepoFullName: varchar("github_repo_full_name", {
    length: 255,
  }).notNull(),
  githubInstallationId: bigint("github_installation_id", {
    mode: "number",
  }).notNull(),
  defaultBranch: varchar("default_branch", { length: 255 })
    .notNull()
    .default("main"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("projects_github_repo_id_idx").on(table.githubRepoId),
  uniqueIndex("projects_workspace_repo_idx").on(table.workspaceId, table.githubRepoId),
]);

export const projectsRelations = relations(projects, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
}));
