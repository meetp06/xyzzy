"use server";

import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/app/lib/env";
import { generateChatReply, type ChatTurn } from "@/app/lib/gemini";
import * as schema from "@/db/schema";
import type { ChatMessage } from "@/db/schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─────────────────────────────────────────────────────────────────────────────
// Get Messages
// ─────────────────────────────────────────────────────────────────────────────

export async function getChatMessagesAction(showId: string): Promise<ChatMessage[]> {
  try {
    return await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.showId, showId))
      .orderBy(asc(schema.chatMessages.createdAt));
  } catch (error) {
    console.error("Failed to fetch chat messages:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Message
// ─────────────────────────────────────────────────────────────────────────────

interface ChatContext {
  topic: string;
  transcript: string;
  researchContext: string;
}

interface SendMessageResult {
  message?: ChatMessage;
  error?: string;
}

export async function sendChatMessageAction(
  showId: string,
  userMessage: string,
  context: ChatContext,
): Promise<SendMessageResult> {
  if (!userMessage.trim()) {
    return { error: "Message cannot be empty." };
  }

  try {
    // Save user message
    await db
      .insert(schema.chatMessages)
      .values({
        showId,
        role: "user",
        content: userMessage.trim(),
      });

    // Fetch conversation history for context
    const history = await db
      .select()
      .from(schema.chatMessages)
      .where(eq(schema.chatMessages.showId, showId))
      .orderBy(asc(schema.chatMessages.createdAt));

    // Build messages for LLM
    const systemPrompt = `You are a knowledgeable and entertaining assistant for a talk show segment about "${context.topic}".

You have access to the show's full transcript and research context below. Answer the user's questions based on this information. Be concise, informative, and match the show's tone when appropriate.

TRANSCRIPT:
${context.transcript}

RESEARCH CONTEXT:
${context.researchContext}

Guidelines:
- Ground your answers in the transcript and research when possible
- If asked about something not covered, say so honestly
- Keep responses concise (2-4 sentences unless more detail is requested)
- You can reference specific parts of the transcript`;

    if (!env.GOOGLE_GENERATIVE_AI_API_KEY)
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required");

    const chatHistory: ChatTurn[] = history.slice(0, -1).map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      text: msg.content,
    }));

    const resultText = await generateChatReply(chatHistory, userMessage.trim(), systemPrompt);

    // Save assistant response
    const [savedAssistantMsg] = await db
      .insert(schema.chatMessages)
      .values({
        showId,
        role: "assistant",
        content: resultText,
      })
      .returning();

    return { message: savedAssistantMsg };
  } catch (error) {
    console.error("Chat error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate response.";
    return { error: message };
  }
}
