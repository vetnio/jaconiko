import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).trim(),
});

export const createProjectSchema = z.object({
  githubRepoId: z.number().int().positive(),
  githubRepoFullName: z.string().min(1).max(255),
  githubInstallationId: z.number().int().positive(),
  defaultBranch: z.string().max(255).optional().default("main"),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(["user", "admin"]),
});

export const deleteMemberSchema = z.object({
  memberId: z.string().uuid(),
});

export const createInvitationSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.toLowerCase().trim()),
  role: z.enum(["user", "admin"]).optional().default("user"),
});

export const handleInvitationSchema = z.object({
  invitationId: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
});

export const chatMessageSchema = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1).max(10000),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  technicalLevel: z
    .enum(["non_technical", "semi_technical", "technical"])
    .optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const createThreadSchema = z.object({
  projectId: z.string().uuid(),
});

export const updateThreadSchema = z.object({
  threadId: z.string().uuid(),
  title: z.string().min(1).max(255),
});

export const deleteThreadSchema = z.object({
  threadId: z.string().uuid(),
});

export const chatTitleSchema = z.object({
  threadId: z.string().uuid(),
  firstMessage: z.string().min(1).max(10000),
});
