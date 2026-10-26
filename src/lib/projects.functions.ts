import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTemplate } from "./templates";

const idSchema = z.string().uuid();

/** Project summaries for the dashboard, with a count of unreverted file changes. */
export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, name, description, site_type, direction, version, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: changes, error: cErr } = await supabase.from("file_changes").select("project_id").is("reverted_at", null);
    if (cErr) throw new Error(cErr.message);
    const counts = new Map<string, number>();
    for (const c of changes ?? []) counts.set(c.project_id, (counts.get(c.project_id) ?? 0) + 1);
    return (projects ?? []).map((p) => ({ ...p, editedCount: counts.get(p.id) ?? 0 }));
  });

/** Full project payload for the workspace: files, messages, changes, runs and checks. */
export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: idSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!project) return null;
    const [files, messages, changes, runs, tests] = await Promise.all([
      supabase.from("project_files").select("path, content, updated_at").eq("project_id", data.id),
      supabase.from("messages").select("id, role, content, created_at").eq("project_id", data.id).order("created_at"),
      supabase
        .from("file_changes")
        .select("id, path, op, before_content, after_content, version, reverted_at, created_at")
        .eq("project_id", data.id)
        .order("created_at"),
      supabase
        .from("ai_runs")
        .select("id, kind, status, model, error_code, error_message, summary, input_tokens, output_tokens, created_at, finished_at")
        .eq("project_id", data.id)
        .order("created_at"),
      supabase.from("test_runs").select("id, status, results, created_at").eq("project_id", data.id).order("created_at"),
    ]);
    for (const r of [files, messages, changes, runs, tests]) if (r.error) throw new Error(r.error.message);
    return {
      project,
      files: files.data ?? [],
      messages: messages.data ?? [],
      changes: changes.data ?? [],
      runs: runs.data ?? [],
      tests: tests.data ?? [],
    };
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        description: z.string().trim().min(10).max(4000),
        siteType: z.enum(["landing", "portfolio", "store", "blog"]),
        direction: z.enum(["minimal", "editorial", "bold"]),
        lang: z.enum(["ar", "en"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ name: data.name, description: data.description, site_type: data.siteType, direction: data.direction })
      .select("id, created_at, updated_at, version")
      .single();
    if (error || !project) throw new Error(error?.message ?? "create failed");
    const files = buildTemplate({ name: data.name, description: data.description, type: data.siteType, direction: data.direction, lang: data.lang });
    const { error: fErr } = await supabase
      .from("project_files")
      .insert(Object.entries(files).map(([path, content]) => ({ project_id: project.id, path, content })));
    if (fErr) throw new Error(fErr.message);
    await supabase.from("messages").insert({ project_id: project.id, role: "user", content: data.description });
    await supabase.from("usage_events").insert({ project_id: project.id, kind: "project_created", detail: { siteType: data.siteType } });
    return project;
  });

export const renameProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: idSchema, name: z.string().trim().min(1).max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("projects")
      .update({ name: data.name, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: idSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: idSchema, suffix: z.string().max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: src, error } = await supabase.from("projects").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("not found");
    const { data: copy, error: cErr } = await supabase
      .from("projects")
      .insert({
        name: `${src.name} ${data.suffix}`.slice(0, 60),
        description: src.description,
        site_type: src.site_type,
        direction: src.direction,
        source: "duplicate",
      })
      .select("id, created_at, updated_at, version")
      .single();
    if (cErr || !copy) throw new Error(cErr?.message ?? "duplicate failed");
    const { data: files } = await supabase.from("project_files").select("path, content").eq("project_id", data.id);
    if (files?.length) {
      await supabase.from("project_files").insert(files.map((f) => ({ project_id: copy.id, path: f.path, content: f.content })));
    }
    const { data: msgs } = await supabase.from("messages").select("role, content, created_at").eq("project_id", data.id).order("created_at");
    if (msgs?.length) {
      await supabase.from("messages").insert(msgs.map((m) => ({ project_id: copy.id, role: m.role, content: m.content, created_at: m.created_at })));
    }
    return copy;
  });

/**
 * Reverts one recorded change. Only succeeds when the change is the latest
 * non-reverted change for its path and the file still matches its after-content.
 */
export const revertChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ projectId: idSchema, changeId: idSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: ch, error } = await supabase
      .from("file_changes")
      .select("id, path, before_content, after_content, reverted_at")
      .eq("id", data.changeId)
      .eq("project_id", data.projectId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ch || ch.reverted_at) return { ok: false as const, reason: "conflict" as const };

    const { data: latest } = await supabase
      .from("file_changes")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("path", ch.path)
      .is("reverted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.id !== ch.id) return { ok: false as const, reason: "conflict" as const };

    const { data: file } = await supabase.from("project_files").select("content").eq("project_id", data.projectId).eq("path", ch.path).maybeSingle();
    if ((file?.content ?? null) !== (ch.after_content ?? null)) return { ok: false as const, reason: "conflict" as const };

    const { data: project } = await supabase.from("projects").select("version").eq("id", data.projectId).single();
    const ops =
      ch.before_content === null
        ? [{ path: ch.path, op: "delete", kind: "revert" }]
        : [{ path: ch.path, op: "upsert", content: ch.before_content, kind: "revert" }];
    const { error: rpcErr } = await supabase.rpc("commit_file_changes", {
      _project_id: data.projectId,
      _base_version: project?.version ?? 0,
      _run_id: null,
      _ops: ops,
    });
    if (rpcErr) return { ok: false as const, reason: "conflict" as const };
    await supabase.from("file_changes").update({ reverted_at: new Date().toISOString() }).eq("id", ch.id);
    return { ok: true as const };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ displayName: z.string().trim().min(1).max(80) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ display_name: data.displayName, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Real usage counts for the signed-in user. */
export const getUsageStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [p, r, c] = await Promise.all([
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase.from("ai_runs").select("id", { count: "exact", head: true }),
      supabase.from("file_changes").select("id", { count: "exact", head: true }),
    ]);
    return { projects: p.count ?? 0, runs: r.count ?? 0, changes: c.count ?? 0 };
  });

/** Whether the server-side AI key is configured. Never returns the key itself. */
export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { geminiConfig } = await import("./ai/gemini.server");
    const { configured, model } = geminiConfig();
    return { configured, model };
  });
