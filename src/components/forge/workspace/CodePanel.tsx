import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, FileCode2, FileText, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../common";
import { useApp, type Project } from "@/lib/store";
import { langOf, tokenizeLine } from "@/lib/highlight";
import { cn } from "@/lib/utils";

export async function copyText(text: string, t: ReturnType<typeof useApp>["t"]) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t("copied"));
    return true;
  } catch {
    toast.error(t("copyFailed"));
    return false;
  }
}

export function modifiedPaths(p: Project) {
  return new Set(p.changes.filter((c) => !c.reverted).map((c) => c.path));
}

export function CodeView({ path, content }: { path: string; content: string }) {
  const { prefs } = useApp();
  const lang = langOf(path);
  const lines = content.split("\n");
  return (
    <pre className={cn("font-mono text-[13px] leading-6", prefs.wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre")} dir="ltr">
      <code>
        {lines.map((l, i) => (
          <div key={i} className="flex">
            {prefs.lineNumbers && <span className="sticky left-0 w-10 shrink-0 select-none bg-card pe-3 text-end text-muted-foreground/70">{i + 1}</span>}
            <span className="min-w-0 flex-1 px-3">
              {tokenizeLine(l, lang).map((tk, j) => (
                <span key={j} className={tk.t === "plain" ? undefined : `tok-${tk.t}`}>
                  {tk.v}
                </span>
              ))}
              {l === "" && "\u200b"}
            </span>
          </div>
        ))}
      </code>
    </pre>
  );
}

export function CodePanel({ project, compact = false }: { project: Project; compact?: boolean }) {
  const { t } = useApp();
  const paths = useMemo(() => Object.keys(project.files).sort(), [project.files]);
  const [sel, setSel] = useState<string | null>(compact ? null : (paths[0] ?? null));
  const [copied, setCopied] = useState(false);
  const mod = modifiedPaths(project);
  const added = new Set(project.changes.filter((c) => !c.reverted && c.before === null).map((c) => c.path));

  useEffect(() => {
    if (sel && !(sel in project.files)) setSel(compact ? null : (paths[0] ?? null));
  }, [paths, sel, project.files, compact]);

  if (!paths.length) return <EmptyState icon={<FolderOpen />} title={t("noFiles")} />;

  const explorer = (
    <nav aria-label={t("files")} className="p-2">
      <p className="eyebrow px-2 pb-2 pt-1">{t("files")}</p>
      <ul className="space-y-0.5">
        {paths.map((p) => {
          const Icon = langOf(p) === "md" ? FileText : FileCode2;
          return (
            <li key={p}>
              <button
                onClick={() => setSel(p)}
                aria-current={sel === p ? "true" : undefined}
                className={cn(
                  "flex h-11 w-full items-center gap-2 rounded-md px-2 text-start text-sm lg:h-9",
                  sel === p ? "bg-secondary font-medium" : "hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono text-[13px]" dir="ltr">
                  {p}
                </span>
                {mod.has(p) && (
                  <span className="shrink-0 rounded-sm bg-highlight px-1.5 text-[10px] font-semibold text-highlight-foreground" title={added.has(p) ? t("added") : t("modified")}>
                    {added.has(p) ? "A" : "M"}
                    <span className="sr-only"> {added.has(p) ? t("added") : t("modified")}</span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const viewer = sel ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        {compact && (
          <Button variant="ghost" size="icon-touch" onClick={() => setSel(null)} aria-label={t("backToFiles")}>
            <ArrowLeft className="rtl:rotate-180" />
          </Button>
        )}
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]" dir="ltr">
          {sel}
        </span>
        {mod.has(sel) && <span className="text-xs text-muted-foreground">{t("modified")}</span>}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={async () => {
            if (await copyText(project.files[sel] ?? "", t)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }
          }}
        >
          {copied ? <Check /> : <Copy />} {copied ? t("copied") : t("copy")}
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-card py-2">
        <CodeView path={sel} content={project.files[sel] ?? ""} />
      </div>
    </div>
  ) : (
    <EmptyState icon={<FileCode2 />} title={t("selectFile")} />
  );

  if (compact) return <div className="h-full min-h-0 overflow-y-auto">{sel ? viewer : explorer}</div>;

  return (
    <div className="grid h-full min-h-0 grid-cols-[220px_minmax(0,1fr)]">
      <div className="min-h-0 overflow-y-auto border-e border-border">{explorer}</div>
      <div className="min-h-0">{viewer}</div>
    </div>
  );
}
