import { GoogleGenAI } from "@google/genai";
import { AiError, classifyError } from "./errors";
import { aiOutputJsonSchema } from "../project-files";
import { SYSTEM_PROMPT } from "./prompt";

export const DEFAULT_MODEL = "gemini-3.8-flash";

export function geminiConfig() {
  const key = process.env["GEMINI_API_KEY"];
  const model = process.env["GEMINI_MODEL"]?.trim() || DEFAULT_MODEL;
  return { configured: !!key, model, key };
}

export type StreamEvent = { type: "delta"; text: string } | { type: "usage"; input?: number; output?: number };

/**
 * Streams a structured JSON answer from Gemini via the Interactions API.
 * The API key is read here, server-side only, and never returned or logged.
 */
export async function* streamGemini(input: string, signal: AbortSignal): AsyncGenerator<StreamEvent> {
  const { key, model } = geminiConfig();
  if (!key) throw new AiError("not_configured", "GEMINI_API_KEY is not configured on the server");
  const client = new GoogleGenAI({ apiKey: key });
  let stream;
  try {
    stream = await client.interactions.create(
      {
        model,
        input,
        system_instruction: SYSTEM_PROMPT,
        stream: true,
        response_format: { type: "text", mime_type: "application/json", schema: aiOutputJsonSchema as unknown as Record<string, unknown> },
        generation_config: { thinking_level: "low", max_output_tokens: 60_000 },
      },
      { fetchOptions: { signal }, timeout_ms: 150_000 },
    );
  } catch (err) {
    throw classifyError(err);
  }
  try {
    for await (const ev of stream as AsyncIterable<{ event_type: string; delta?: { type?: string; text?: string }; metadata?: { total_usage?: { total_input_tokens?: number; total_output_tokens?: number } }; error?: { code?: string; message?: string } }>) {
      if (signal.aborted) throw new AiError("aborted", "Request was stopped");
      if (ev.event_type === "step.delta") {
        if (ev.delta?.type === "text" && ev.delta.text) yield { type: "delta", text: ev.delta.text };
        const u = ev.metadata?.total_usage;
        if (u) {
          const usage: StreamEvent = { type: "usage" };
          if (u.total_input_tokens !== undefined) usage.input = u.total_input_tokens;
          if (u.total_output_tokens !== undefined) usage.output = u.total_output_tokens;
          yield usage;
        }
      } else if (ev.event_type === "error") {
        throw classifyError({ message: ev.error?.message ?? "stream error", code: ev.error?.code });
      }
    }
  } catch (err) {
    throw classifyError(err);
  }
}
