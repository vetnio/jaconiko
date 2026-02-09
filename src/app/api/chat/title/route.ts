import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chatThreads } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { chatTitleSchema } from "@/lib/validations";
import { verifyThreadAccess } from "@/lib/auth/membership";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = chatTitleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { threadId, firstMessage } = parsed.data;

  // Verify thread access (ownership + workspace membership)
  const access = await verifyThreadAccess(session.user.id, threadId);
  if (!access) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-4-5-20251001"),
      prompt: `Generate a short, descriptive title (max 50 characters) for a chat thread that starts with this message. Return ONLY the title, nothing else.\n\nMessage: "${firstMessage}"`,
    });

    const title = text.trim().slice(0, 50);

    await db
      .update(chatThreads)
      .set({ title })
      .where(
        and(
          eq(chatThreads.id, threadId),
          eq(chatThreads.userId, session.user.id)
        )
      );

    return NextResponse.json({ title });
  } catch {
    return NextResponse.json({ title: "New chat" });
  }
}
