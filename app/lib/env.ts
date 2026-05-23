/* eslint-disable node/no-process-env */
import { z } from "zod";

function optionalString(description: string, _message?: string) {
  return z.string().trim().optional().transform(v => (v === "" ? undefined : v)).describe(description);
}

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development").describe("Runtime environment."),

  // Mux credentials (optional in dev — required at runtime for Mux features)
  MUX_TOKEN_ID: optionalString("Mux access token ID."),
  MUX_TOKEN_SECRET: optionalString("Mux access token secret."),

  // Mux signing keys (optional, for signed playback URLs)
  MUX_SIGNING_KEY: optionalString("Mux signing key ID for signed playback URLs."),
  MUX_PRIVATE_KEY: optionalString("Mux signing private key for signed playback URLs."),

  // AI provider keys (optional, depends on which provider you use but at least one is required)
  OPENAI_API_KEY: optionalString("OpenAI API key for OpenAI-backed workflows."),
  ANTHROPIC_API_KEY: optionalString("Anthropic API key for Claude-backed workflows."),

  // Google Gemini API key (for LLM, Video Generation, and TTS)
  GOOGLE_GENERATIVE_AI_API_KEY: optionalString("Google Generative AI API key for Gemini LLM, Veo video generation, and TTS."),

  // ElevenLabs API key (optional; required only if you want to use translateAudio)
  ELEVENLABS_API_KEY: optionalString("ElevenLabs API key for translateAudio workflow."),

  // S3-Compatible Storage (optional in dev — required at runtime for translation workflows)
  S3_ENDPOINT: optionalString("S3 endpoint for translation workflows."),
  S3_REGION: optionalString("S3 region for translation workflows."),
  S3_BUCKET: optionalString("S3 bucket for translation workflows."),
  S3_ACCESS_KEY_ID: optionalString("S3 access key ID for translation workflows."),
  S3_SECRET_ACCESS_KEY: optionalString("S3 secret access key for translation workflows."),

  // Database (PostgreSQL with pgvector) — optional in dev, required at runtime for DB features
  DATABASE_URL: optionalString("PostgreSQL connection string (pgvector). Required to store/search the Mux catalog metadata."),

  // Remotion Lambda (optional; required only if you want to render social clips)
  REMOTION_AWS_ACCESS_KEY_ID: optionalString("Remotion AWS access key ID for rendering social clips."),
  REMOTION_AWS_SECRET_ACCESS_KEY: optionalString("Remotion AWS secret access key for rendering social clips."),

});

export type Env = z.infer<typeof EnvSchema>;

function parseEnv(): Env {
  // Skip validation during Next.js build phase to allow building without runtime env vars
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return process.env as unknown as Env;
  }

  const parsedEnv = EnvSchema.safeParse(process.env);

  if (!parsedEnv.success) {
    console.error("⚠ Environment validation failed (ignoring for dev server stability):");
    console.error(JSON.stringify(parsedEnv.error.flatten().fieldErrors, null, 2));
    // Return process.env anyway instead of crashing
    return process.env as unknown as Env;
  }

  return parsedEnv.data;
}

// Parse on module load (server-side only)
const env: Env = parseEnv();

export { env };
export default env;
