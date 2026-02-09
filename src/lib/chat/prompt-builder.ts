import type { RetrievedChunk } from "./retriever";

type TechnicalLevel = "non_technical" | "semi_technical" | "technical" | null;

const SYSTEM_PROMPTS: Record<string, string> = {
  non_technical: `You are a helpful product assistant for a software project. Your job is to help non-technical people (product managers, designers, executives) understand their codebase.

Rules:
- Explain everything in plain English. Do NOT reference file names, function names, or code.
- Focus on what the software does from a user/business perspective.
- Use analogies and simple language.
- When asked about features, describe them in terms of user experience and business logic.
- Never show code snippets unless explicitly asked.
- If asked about feasibility, give practical estimates and describe dependencies in plain terms.`,

  semi_technical: `You are a helpful product assistant for a software project. Your audience has some technical understanding but isn't a developer.

Rules:
- You can reference file names and high-level architecture when relevant.
- Avoid showing raw code unless specifically asked.
- Explain technical concepts in accessible terms.
- When discussing architecture, use diagrams-in-words (e.g., "the login page talks to the auth service, which checks the database").
- You can mention technologies and frameworks by name but explain what they do.`,

  technical: `You are a helpful codebase assistant. Your audience is technical and can read code.

Rules:
- Reference specific files, functions, and architectural patterns.
- Include file paths and relevant technical details.
- Show code snippets when they help explain the answer.
- Discuss implementation details, design patterns, and technical trade-offs.
- Be precise about which files and functions are involved.`,
};

export function buildSystemPrompt(
  technicalLevel: TechnicalLevel,
  chunks: RetrievedChunk[],
  repoName: string
): string {
  const level = technicalLevel || "semi_technical";
  const basePrompt = SYSTEM_PROMPTS[level] || SYSTEM_PROMPTS.semi_technical;

  let contextSection = "";
  if (chunks.length > 0) {
    contextSection = "\n\n--- CODEBASE CONTEXT ---\n";
    contextSection += `Repository: ${repoName}\n\n`;

    for (const chunk of chunks) {
      contextSection += `File: ${chunk.filePath} (lines ${chunk.startLine}-${chunk.endLine})`;
      if (chunk.language) contextSection += ` [${chunk.language}]`;
      contextSection += "\n```\n";
      contextSection += chunk.content;
      contextSection += "\n```\n\n";
    }

    contextSection += "--- END CODEBASE CONTEXT ---\n";
    contextSection +=
      "\nUse the codebase context above to answer the user's question. If the context doesn't contain enough information, say so honestly.";
  }

  return basePrompt + contextSection;
}

export function buildMessages(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  currentMessage: string
): Array<{ role: "user" | "assistant"; content: string }> {
  // Include last 20 messages for context
  const recentHistory = history.slice(-20);
  return [...recentHistory, { role: "user" as const, content: currentMessage }];
}
