export type AiErrorCode = "not_configured" | "auth" | "model" | "quota" | "timeout" | "aborted" | "network" | "server" | "invalid_output" | "bad_request";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
    public status?: number,
  ) {
    super(message);
  }
  get retryable() {
    return this.code === "network" || this.code === "server";
  }
}

/** Map provider/SDK errors to safe, user-facing categories. Never includes request data or keys. */
export function classifyError(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const e = err as { name?: string; status?: number; statusCode?: number; code?: string | number; message?: string; response?: { status?: number } };
  if (e?.name === "AbortError" || e?.code === "ABORT_ERR") return new AiError("aborted", "Request was stopped");
  if (e?.name === "TimeoutError" || /timed? ?out/i.test(e?.message ?? "")) return new AiError("timeout", "The AI provider timed out");
  const status = e?.status ?? e?.statusCode ?? e?.response?.status;
  const msg = (e?.message ?? "").toLowerCase();
  if (status === 401 || status === 403 || /api key|permission|unauthenticated/.test(msg)) return new AiError("auth", "The AI provider rejected the server API key", status);
  if (status === 429 || /quota|resource.?exhausted|rate limit/.test(msg)) return new AiError("quota", "AI quota or rate limit reached", status);
  if (status === 404 || /model.*not found|not supported for/.test(msg)) return new AiError("model", "The configured AI model is unavailable", status);
  if (status === 400) return new AiError("bad_request", "The AI provider rejected the request", status);
  if (typeof status === "number" && status >= 500) return new AiError("server", "The AI provider had a server error", status);
  if (/fetch failed|network|econn|socket/.test(msg)) return new AiError("network", "Network error reaching the AI provider");
  return new AiError("server", "Unexpected AI provider error", status);
}

/** Retry only transient failures, with bounded exponential backoff. */
export async function withRetry<T>(fn: () => Promise<T>, opts: { attempts?: number; baseMs?: number; signal?: AbortSignal } = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  let last: AiError | undefined;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = classifyError(err);
      if (!last.retryable || i === attempts - 1 || opts.signal?.aborted) throw last;
      const wait = (opts.baseMs ?? 500) * 2 ** i + Math.random() * 200;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last ?? new AiError("server", "Unknown error");
}
