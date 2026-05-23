-- Show Templates
CREATE TABLE IF NOT EXISTS "show_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "show_type" text NOT NULL,
  "reference_image_url" text,
  "hosts" jsonb NOT NULL,
  "notes" text,
  "is_default" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- Generated Shows
CREATE TABLE IF NOT EXISTS "generated_shows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "template_id" uuid NOT NULL REFERENCES "show_templates"("id"),
  "topic" text NOT NULL,
  "topic_type" text NOT NULL,
  "duration_seconds" integer NOT NULL,
  "familiarity" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "research_context" text,
  "transcript" text,
  "transcript_segments" jsonb,
  "mux_asset_id" text,
  "mux_playback_id" text,
  "error" text,
  "workflow_run_id" text,
  "language" text DEFAULT 'en',
  "user_id" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "generated_shows_user_id_idx" ON "generated_shows" ("user_id");
CREATE INDEX IF NOT EXISTS "generated_shows_status_idx" ON "generated_shows" ("status");

-- Video Clips (VEO-generated 10s segments)
CREATE TABLE IF NOT EXISTS "video_clips" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "show_id" uuid NOT NULL REFERENCES "generated_shows"("id") ON DELETE CASCADE,
  "clip_index" integer NOT NULL,
  "duration_seconds" integer NOT NULL,
  "prompt" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "video_url" text,
  "error" text,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "video_clips_show_id_idx" ON "video_clips" ("show_id");

-- Chat Messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "show_id" uuid NOT NULL REFERENCES "generated_shows"("id") ON DELETE CASCADE,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "chat_messages_show_id_idx" ON "chat_messages" ("show_id");

-- User Settings
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL UNIQUE,
  "age" integer,
  "location" text,
  "default_language" text DEFAULT 'en',
  "default_familiarity" text DEFAULT 'familiar',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
