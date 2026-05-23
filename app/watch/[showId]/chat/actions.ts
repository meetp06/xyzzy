"use server";

import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/app/lib/env";
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
    const [savedUserMsg] = await db
      .insert(schema.chatMessages)
      .values({
        showId,
        role: "user",
        content: userMessage.trim(),
      })
      .returning();

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

    const messages = history.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Call MiniMax chat/completions directly
    const apiKey = env.MINIMAX_API_KEY;
    if (!apiKey) throw new Error("MINIMAX_API_KEY is required");

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const chatResponse = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "MiniMax-M2.7",
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 4096,
      })
    });

    const chatData = await chatResponse.json();
    if (!chatResponse.ok) {
      throw new Error(`MiniMax API error: ${chatData.base_resp?.status_msg || JSON.stringify(chatData)}`);
    }

    const resultText = chatData.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("MiniMax returned empty response");
    }

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
