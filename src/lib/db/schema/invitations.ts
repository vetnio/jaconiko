import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  pgEnum,
  text,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth";
import { workspaces } from "./workspaces";

export const invitationRoleEnum = pgEnum("invitation_role", ["user", "admin"]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
]);

export const workspaceInvitations = pgTable("workspace_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  invitedById: text("invited_by_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: invitationRoleEnum("role").notNull().default("user"),
  status: invitationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("invitations_email_status_idx").on(table.email, table.status),
]);

export const workspaceInvitationsRelations = relations(
  workspaceInvitations,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceInvitations.workspaceId],
      references: [workspaces.id],
    }),
    invitedBy: one(user, {
      fields: [workspaceInvitations.invitedById],
      references: [user.id],
    }),
  })
);
