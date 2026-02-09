import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects } from "./projects";

export const codeChunks = pgTable(
  "code_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    filePath: varchar("file_path", { length: 1000 }).notNull(),
    content: text("content").notNull(),
    startLine: integer("start_line").notNull(),
    endLine: integer("end_line").notNull(),
    language: varchar("language", { length: 50 }),
    embedding: vector("embedding", { dimensions: 1024 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("code_chunks_project_id_idx").on(table.projectId),
  ]
);

export const codeChunksRelations = relations(codeChunks, ({ one }) => ({
  project: one(projects, {
    fields: [codeChunks.projectId],
    references: [projects.id],
  }),
}));
