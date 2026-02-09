import { pgTable, uuid, varchar, timestamp, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { projects } from "./projects";

export const chatThreads = pgTable("chat_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull().default("New chat"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("chat_threads_project_user_idx").on(table.projectId, table.userId),
]);

export const chatThreadsRelations = relations(chatThreads, ({ one }) => ({
  project: one(projects, {
    fields: [chatThreads.projectId],
    references: [projects.id],
  }),
  user: one(user, {
    fields: [chatThreads.userId],
    references: [user.id],
  }),
}));
