"use server";

import { asc, count, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { revalidatePath } from "next/cache";
import { Pool } from "pg";

import { env } from "@/app/lib/env";
import * as schema from "@/db/schema";

import type { ShowTemplate } from "@/db/schema";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateInput {
  name: string;
  showType: string;
  referenceImageUrl?: string;
  hosts: Array<{ name: string; personality?: string; position?: string }>;
  notes?: string;
  isDefault?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateTemplate(data: TemplateInput): string | null {
  if (!data.name?.trim()) return "Template name is required.";
  if (!["monologue", "conversation"].includes(data.showType)) return "Show type must be monologue or conversation.";
  if (!data.hosts || data.hosts.length === 0) return "At least one host is required.";
  for (const host of data.hosts) {
    if (!host.name?.trim()) return "Each host must have a name.";
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get All Templates
// ─────────────────────────────────────────────────────────────────────────────

export async function getTemplatesAction(): Promise<ShowTemplate[]> {
  try {
    return await db
      .select()
      .from(schema.showTemplates)
      .orderBy(desc(schema.showTemplates.isDefault), asc(schema.showTemplates.createdAt));
  } catch (error) {
    console.error("Failed to fetch templates:", error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Template By ID
// ─────────────────────────────────────────────────────────────────────────────

export async function getTemplateByIdAction(
  id: string,
): Promise<{ template?: ShowTemplate; error?: string }> {
  try {
    const template = await db.query.showTemplates.findFirst({
      where: eq(schema.showTemplates.id, id),
    });
    if (!template) return { error: "Template not found." };
    return { template };
  } catch (error) {
    console.error("Failed to fetch template:", error);
    return { error: "Failed to fetch template." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Template
// ─────────────────────────────────────────────────────────────────────────────

export async function createTemplateAction(
  data: TemplateInput,
): Promise<{ templateId?: string; error?: string }> {
  const validationError = validateTemplate(data);
  if (validationError) return { error: validationError };

  try {
    const [template] = await db
      .insert(schema.showTemplates)
      .values({
        name: data.name.trim(),
        showType: data.showType,
        referenceImageUrl: data.referenceImageUrl?.trim() || null,
        hosts: data.hosts.map(h => ({
          name: h.name.trim(),
          personality: h.personality?.trim() || undefined,
          position: h.position || undefined,
        })),
        notes: data.notes?.trim() || null,
        isDefault: data.isDefault ?? false,
      })
      .returning({ id: schema.showTemplates.id });

    return { templateId: template.id };
  } catch (error) {
    console.error("Failed to create template:", error);
    return { error: "Failed to create template." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Template
// ─────────────────────────────────────────────────────────────────────────────

export async function updateTemplateAction(
  id: string,
  data: TemplateInput,
): Promise<{ success?: boolean; error?: string }> {
  const validationError = validateTemplate(data);
  if (validationError) return { error: validationError };

  try {
    const result = await db
      .update(schema.showTemplates)
      .set({
        name: data.name.trim(),
        showType: data.showType,
        referenceImageUrl: data.referenceImageUrl?.trim() || null,
        hosts: data.hosts.map(h => ({
          name: h.name.trim(),
          personality: h.personality?.trim() || undefined,
          position: h.position || undefined,
        })),
        notes: data.notes?.trim() || null,
        isDefault: data.isDefault ?? false,
        updatedAt: new Date(),
      })
      .where(eq(schema.showTemplates.id, id))
      .returning({ id: schema.showTemplates.id });

    if (result.length === 0) return { error: "Template not found." };
    return { success: true };
  } catch (error) {
    console.error("Failed to update template:", error);
    return { error: "Failed to update template." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Template
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteTemplateAction(
  id: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    // Check for dependent shows
    const [result] = await db
      .select({ total: count() })
      .from(schema.generatedShows)
      .where(eq(schema.generatedShows.templateId, id));

    if (result.total > 0) {
      return { error: `Cannot delete: template is used by ${result.total} show(s).` };
    }

    await db
      .delete(schema.showTemplates)
      .where(eq(schema.showTemplates.id, id));

    revalidatePath("/templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { error: "Failed to delete template." };
  }
}
