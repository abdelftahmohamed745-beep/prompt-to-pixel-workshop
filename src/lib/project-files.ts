import { z } from "zod";

/** Limits applied to every project, both client and server side. */
export const LIMITS = {
  maxFiles: 40,
  maxFileChars: 200_000,
  maxTotalChars: 600_000,
  maxPathLength: 120,
  maxPromptChars: 4_000,
  maxEditsPerRun: 20,
} as const;

const ALLOWED_EXT = ["html", "css", "js", "mjs", "json", "md", "svg", "txt"] as const;
const BLOCKED_NAMES = /(^|\/)(\.env.*|\.git|\.npmrc|id_rsa.*|.*\.pem|.*\.key|secrets?\..*)$/i;

export type FileMap = Record<string, string>;

/** Returns a normalized safe path, or null if the path is not allowed. */
export function safePath(input: string): string | null {
  if (typeof input !== "string") return null;
  const p = input.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  if (!p || p.length > LIMITS.maxPathLength) return null;
  if (p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return null;
  if (!/^[a-zA-Z0-9._\-/]+$/.test(p)) return null;
  const parts = p.split("/");
  if (parts.some((s) => s === "" || s === "." || s === ".." || s.startsWith("."))) return null;
  if (parts.length > 4) return null;
  if (BLOCKED_NAMES.test(p)) return null;
  const ext = p.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_EXT as readonly string[]).includes(ext)) return null;
  return p;
}

export const editSchema = z.object({
  path: z.string().min(1).max(LIMITS.maxPathLength),
  action: z.enum(["create", "replace", "delete"]),
  content: z.string().max(LIMITS.maxFileChars).optional().nullable(),
});

export const aiOutputSchema = z.object({
  summary: z.string().min(1).max(4000),
  plan: z.array(z.string().max(400)).max(12).default([]),
  edits: z.array(editSchema).max(LIMITS.maxEditsPerRun),
  question: z.string().max(1000).optional().nullable(),
});
export type AiOutput = z.infer<typeof aiOutputSchema>;

/** JSON schema sent to the model (mirrors aiOutputSchema). */
export const aiOutputJsonSchema = {
  type: "object",
  properties: {
    summary: { type: "string", description: "Short summary of the actual edits, in the user's language." },
    plan: { type: "array", items: { type: "string" }, description: "Minimal steps taken." },
    edits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          action: { type: "string", enum: ["create", "replace", "delete"] },
          content: { type: "string", description: "Full new file content for create/replace." },
        },
        required: ["path", "action"],
      },
    },
    question: { type: "string", description: "Only if truly blocked; otherwise empty." },
  },
  required: ["summary", "plan", "edits"],
} as const;

export type FileOp = { path: string; op: "upsert" | "delete"; content?: string };

export class EditError extends Error {
  constructor(
    public code: "invalid_path" | "too_large" | "too_many_files" | "missing_content" | "missing_file" | "no_changes",
    message: string,
  ) {
    super(message);
  }
}

/** Validates AI edits against the current files and returns DB ops plus the resulting file map. */
export function planEdits(current: FileMap, edits: AiOutput["edits"]): { ops: FileOp[]; next: FileMap } {
  const next: FileMap = { ...current };
  const ops: FileOp[] = [];
  for (const e of edits) {
    const path = safePath(e.path);
    if (!path) throw new EditError("invalid_path", `Rejected path: ${String(e.path).slice(0, 80)}`);
    if (e.action === "delete") {
      if (!(path in next)) throw new EditError("missing_file", `Cannot delete missing file ${path}`);
      delete next[path];
      ops.push({ path, op: "delete" });
      continue;
    }
    if (typeof e.content !== "string") throw new EditError("missing_content", `No content for ${path}`);
    if (e.content.length > LIMITS.maxFileChars) throw new EditError("too_large", `${path} exceeds size limit`);
    if (next[path] === e.content) continue;
    next[path] = e.content;
    ops.push({ path, op: "upsert", content: e.content });
  }
  if (Object.keys(next).length > LIMITS.maxFiles) throw new EditError("too_many_files", "Too many files");
  const total = Object.values(next).reduce((n, c) => n + c.length, 0);
  if (total > LIMITS.maxTotalChars) throw new EditError("too_large", "Project exceeds total size limit");
  // Collapse duplicate ops on the same path: keep the last one.
  const last = new Map<string, FileOp>();
  for (const o of ops) last.set(o.path, o);
  return { ops: [...last.values()], next };
}

/** Bounded context for the model: whole small files, truncated large ones. */
export function buildFileContext(files: FileMap, budget = 120_000): string {
  const paths = Object.keys(files).sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));
  let used = 0;
  const out: string[] = [`FILE TREE:\n${paths.map((p) => `- ${p} (${files[p]!.length} chars)`).join("\n")}`];
  for (const p of paths) {
    const c = files[p]!;
    const room = budget - used;
    if (room <= 200) {
      out.push(`--- ${p} (omitted: context budget reached)`);
      continue;
    }
    const body = c.length > room ? `${c.slice(0, room)}\n…[truncated ${c.length - room} chars — do not replace this file unless needed]` : c;
    used += body.length;
    out.push(`--- FILE: ${p}\n${body}`);
  }
  return out.join("\n\n");
}

/** Inline local CSS/JS references so the sandboxed iframe can render the project. */
export function composePreview(files: FileMap): string | null {
  const html = files["index.html"];
  if (html === undefined) return null;
  const esc = (s: string, tag: string) => s.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);
  return html
    .replace(/<link\b[^>]*href=["']\.?\/?([^"'#?]+\.css)["'][^>]*>/gi, (m, p: string) =>
      files[p] !== undefined ? `<style data-file="${p}">\n${esc(files[p]!, "style")}\n</style>` : m,
    )
    .replace(/<script\b([^>]*)src=["']\.?\/?([^"'#?]+\.m?js)["']([^>]*)><\/script>/gi, (m, a: string, p: string, b: string) =>
      files[p] !== undefined ? `<script${a}${b} data-file="${p}">\n${esc(files[p]!, "script")}\n</script>` : m,
    );
}

export type CheckResult = { id: string; ok: boolean; detail: string };

/** Real static checks over the project files. These do not execute any code. */
export function runStaticChecks(files: FileMap): CheckResult[] {
  const r: CheckResult[] = [];
  const html = files["index.html"];
  r.push({ id: "index_exists", ok: html !== undefined, detail: html !== undefined ? "index.html present" : "index.html missing" });
  if (html === undefined) return r;
  r.push({ id: "doctype", ok: /^\s*<!doctype html>/i.test(html), detail: "<!doctype html> at top" });
  r.push({ id: "lang", ok: /<html[^>]*\slang=["'][a-z-]+["']/i.test(html), detail: "<html lang> set" });
  r.push({ id: "viewport", ok: /<meta[^>]+name=["']viewport["']/i.test(html), detail: "viewport meta present" });
  r.push({ id: "title", ok: /<title>[^<]+<\/title>/i.test(html), detail: "non-empty <title>" });
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const noAlt = imgs.filter((i) => !/\salt=/i.test(i)).length;
  r.push({ id: "img_alt", ok: noAlt === 0, detail: noAlt ? `${noAlt} <img> without alt` : `${imgs.length} images, all with alt` });
  const refs = [...html.matchAll(/(?:href|src)=["']\.?\/?([^"'#?:]+\.(?:css|js|mjs))["']/gi)].map((m) => m[1]!);
  const missing = refs.filter((p) => files[p] === undefined);
  r.push({ id: "local_refs", ok: missing.length === 0, detail: missing.length ? `missing: ${missing.join(", ")}` : `${refs.length} local references resolve` });
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map((m) => m[1]!);
  const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  r.push({ id: "unique_ids", ok: dupes.length === 0, detail: dupes.length ? `duplicate ids: ${dupes.join(", ")}` : "ids unique" });
  for (const [p, c] of Object.entries(files)) {
    if (p.endsWith(".json")) {
      try {
        JSON.parse(c);
        r.push({ id: `json:${p}`, ok: true, detail: `${p} parses` });
      } catch {
        r.push({ id: `json:${p}`, ok: false, detail: `${p} is invalid JSON` });
      }
    }
  }
  return r;
}

/** Browser-only syntax check for JS files (compiles without running). */
export function jsSyntaxChecks(files: FileMap): CheckResult[] {
  return Object.entries(files)
    .filter(([p]) => p.endsWith(".js"))
    .map(([p, c]) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        new Function(c); // parse only — the function is never called
        return { id: `js:${p}`, ok: true, detail: `${p} parses` };
      } catch (e) {
        return { id: `js:${p}`, ok: false, detail: `${p}: ${(e as Error).message.slice(0, 160)}` };
      }
    });
}
