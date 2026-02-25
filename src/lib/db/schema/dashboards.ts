import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { projects } from "./projects";
import { user } from "./auth";
import { chatThreads } from "./threads";

export const widgetTypeEnum = pgEnum("widget_type", [
  "chart_bar",
  "chart_line",
  "chart_pie",
  "data_table",
  "stat_kpi",
]);

export const dashboards = pgTable("dashboards", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  threadId: uuid("thread_id")
    .references(() => chatThreads.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("dashboards_project_user_idx").on(table.projectId, table.userId),
]);

export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: uuid("id").defaultRandom().primaryKey(),
  dashboardId: uuid("dashboard_id")
    .notNull()
    .references(() => dashboards.id, { onDelete: "cascade" }),
  type: widgetTypeEnum("type").notNull(),
  title: text("title").notNull(),
  config: jsonb("config"),
  data: jsonb("data"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("dashboard_widgets_dashboard_id_idx").on(table.dashboardId),
]);

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  project: one(projects, {
    fields: [dashboards.projectId],
    references: [projects.id],
  }),
  user: one(user, {
    fields: [dashboards.userId],
    references: [user.id],
  }),
  thread: one(chatThreads, {
    fields: [dashboards.threadId],
    references: [chatThreads.id],
  }),
  widgets: many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [dashboardWidgets.dashboardId],
    references: [dashboards.id],
  }),
}));
