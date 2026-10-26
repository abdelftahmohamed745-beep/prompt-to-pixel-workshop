import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { aiOutputSchema, planEdits, runStaticChecks, LIMITS, type FileMap } from "@/lib/project-files";
import { buildUserInput } from "@/lib/ai/prompt";
import { AiError, classifyError, type AiErrorCode } from "@/lib/ai/errors";
import { translate, type Lang, type TKey } from "@/lib/i18n";

const enc = new TextEncoder();

const errKey: Record<AiErrorCode, TKey> = {
  not_configured: "aiErrNotConfigured",
  auth: "aiErrAuth",
  model: "aiErrModel",
  quota: "aiErrQuota",
  timeout: "aiErrTimeout",
  aborted: "aiErrServer",
  network: "aiErrNetwork",
  server: "aiErrServer",
  invalid_output: "aiErrInvalid",
  bad_request: "aiErrBadRequest",
};

/** Authenticated Supabase client acting as the caller (RLS applies). */
function userClient(token: string) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Extracts the JSON payload from model output, tolerating code fences. */
function parseModelJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  return JSON.parse(cleaned);
}

export const Route = createFileRoute("/api/ai/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer /i, "") ?? "";
        if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
        const supabase = userClient(token);
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser(token);
        if (authErr || !user) return Response.json({ error: "unauthorized" }, { status: 401 });

        let body: { projectId?: string; prompt?: string; kind?: string; lang?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "bad_request" }, { status: 400 });
        }
        const projectId = body.projectId ?? "";
        const prompt = (body.prompt ?? "").slice(0, LIMITS.maxPromptChars);
        const kind = body.kind === "generate" ? "generate" : "edit";
        const lang: Lang = body.lang === "en" ? "en" : "ar";
        if (!projectId || !prompt.trim()) return Response.json({ error: "bad_request" }, { status: 400 });

        const { data: project } = await supabase
          .from("projects")
          .select("id, name, site_type, direction, version")
          .eq("id", projectId)
          .maybeSingle();
        if (!project) return Response.json({ error: "not_found" }, { status: 404 });
        const { data: fileRows } = await supabase.from("project_files").select("path, content").eq("project_id", projectId);
        const files: FileMap = Object.fromEntries((fileRows ?? []).map((f) => [f.path, f.content]));

        const { data: run, error: runErr } = await supabase
          .from("ai_runs")
          .insert({ project_id: projectId, kind, base_version: project.version })
          .select("id")
          .single();
        if (runErr || !run) return Response.json({ error: "run_create_failed" }, { status: 500 });
        await supabase.from("messages").insert({ project_id: projectId, role: "user", content: prompt, run_id: run.id });

        const signal = request.signal;
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const send = (ev: Record<string, unknown>) => controller.enqueue(enc.encode(`${JSON.stringify(ev)}\n`));
            const finishRun = async (patch: Record<string, unknown>) => {
              await supabase
                .from("ai_runs")
                .update({ ...patch, finished_at: new Date().toISOString() })
                .eq("id", run.id);
            };
            try {
              send({ type: "phase", phase: "planning" });
              const { streamGemini, geminiConfig } = await import("@/lib/ai/gemini.server");
              const { model } = geminiConfig();
              const input = buildUserInput({
                kind,
                prompt,
                files,
                meta: { name: project.name, siteType: project.site_type, direction: project.direction, lang },
              });
              send({ type: "phase", phase: "editing" });
              let raw = "";
              let usage: { input?: number; output?: number } = {};
              for await (const ev of streamGemini(input, signal)) {
                if (ev.type === "delta") {
                  raw += ev.text;
                  send({ type: "delta", text: ev.text });
                } else {
                  usage = { input: ev.input, output: ev.output };
                }
              }
              send({ type: "phase", phase: "testing" });
              const parsed = aiOutputSchema.parse(parseModelJson(raw));
              const { ops, next } = planEdits(files, parsed.edits);
              if (ops.length) {
                const { error: cErr } = await supabase.rpc("commit_file_changes", {
                  _project_id: projectId,
                  _base_version: project.version,
                  _run_id: run.id,
                  _ops: ops,
                });
                if (cErr) throw new AiError("server", cErr.message);
              }
              const checks = runStaticChecks(next);
              const failed = checks.filter((c) => !c.ok);
              await supabase.from("test_runs").insert({
                project_id: projectId,
                run_id: run.id,
                status: failed.length ? "failed" : "passed",
                results: checks,
              });
              await supabase.from("messages").insert({ project_id: projectId, role: "assistant", content: parsed.summary, run_id: run.id });
              await supabase.from("usage_events").insert({
                project_id: projectId,
                kind: "ai_run",
                detail: { model, status: "succeeded", input_tokens: usage.input ?? null, output_tokens: usage.output ?? null },
              });
              await finishRun({
                status: "succeeded",
                model,
                summary: parsed.summary,
                input_tokens: usage.input ?? null,
                output_tokens: usage.output ?? null,
              });
              send({ type: "done", summary: parsed.summary, plan: parsed.plan, checks: { total: checks.length, failed: failed.length } });
            } catch (err) {
              const e =
                err instanceof SyntaxError || (err instanceof Error && err.name === "ZodError")
                  ? new AiError("invalid_output", "AI returned malformed output")
                  : classifyError(err);
              const cancelled = e.code === "aborted";
              await finishRun({ status: cancelled ? "cancelled" : "failed", error_code: e.code, error_message: e.message.slice(0, 500) });
              await supabase.from("usage_events").insert({
                project_id: projectId,
                kind: "ai_run",
                detail: { status: cancelled ? "cancelled" : "failed", code: e.code },
              });
              if (!cancelled) {
                const msg = translate(lang, errKey[e.code] ?? "aiErrServer");
                await supabase.from("messages").insert({ project_id: projectId, role: "assistant", content: msg, run_id: run.id });
                send({ type: "error", code: e.code, message: msg });
              }
            } finally {
              controller.close();
            }
          },
        });
        return new Response(stream, {
          headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
