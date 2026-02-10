import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  messages,
  chatThreads,
  projects,
  user as userTable,
} from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { createCodebaseTools } from "@/lib/chat/tools";
import { buildSystemPrompt, buildMessages } from "@/lib/chat/prompt-builder";
import { chatMessageSchema } from "@/lib/validations";
import { getMembership } from "@/lib/auth/membership";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = chatMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { threadId, message } = parsed.data;

  // Verify thread and get project info
  const [thread] = await db
    .select()
    .from(chatThreads)
    .where(
      and(
        eq(chatThreads.id, threadId),
        eq(chatThreads.userId, session.user.id)
      )
    );

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, thread.projectId));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Verify workspace membership
  const membership = await getMembership(session.user.id, project.workspaceId);
  if (!membership) {
    return NextResponse.json({ error: "Not a workspace member" }, { status: 403 });
  }

  // Get user's technical level
  const [userData] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, session.user.id));

  // Save user message
  await db.insert(messages).values({
    threadId,
    role: "user",
    content: message,
  });

  // Get conversation history
  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(asc(messages.createdAt));

  // Build system prompt (no chunks needed)
  const systemPrompt = buildSystemPrompt(
    userData?.technicalLevel || null,
    project.githubRepoFullName
  );

  const conversationMessages = buildMessages(
    history.slice(0, -1) as Array<{
      role: "user" | "assistant";
      content: string;
    }>,
    message
  );

  // Create codebase exploration tools
  const tools = createCodebaseTools({
    installationId: project.githubInstallationId,
    repoFullName: project.githubRepoFullName,
    defaultBranch: project.defaultBranch,
  });

  // Stream response with tool use
  const result = streamText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: systemPrompt,
    messages: conversationMessages,
    tools,
    maxSteps: 15,
    onFinish: async ({ text }) => {
      // Save assistant response
      await db.insert(messages).values({
        threadId,
        role: "assistant",
        content: text,
      });

      // Update thread timestamp
      await db
        .update(chatThreads)
        .set({ updatedAt: new Date() })
        .where(eq(chatThreads.id, threadId));
    },
  });

  return result.toDataStreamResponse();
}
