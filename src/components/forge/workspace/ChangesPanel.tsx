import { useMemo, useState } from "react";
import { ChevronDown, GitCompare, ScrollText, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "../common";
import { formatDate } from "../status";
import { useApp, type Change, type Project } from "@/lib/store";
import { diffLines, diffStats } from "@/lib/diff";
import { cn } from "@/lib/utils";

function DiffBlock({ change }: { change: Change }) {
  const lines = useMemo(() => diffLines(change.before ?? "", change.after), [change]);
  // Show changed lines with 2 lines of context.
  const keep = new Set<number>();
  lines.forEach((l, i) => {
    if (l.type !== "same") for (let k = i - 2; k <= i + 2; k++) keep.add(k);
  });
  return (
    <pre className="overflow-x-auto bg-card py-1 font-mono text-[12.5px] leading-6" dir="ltr">
      {lines.map((l, i) =>
        keep.has(i) ? (
          <div
            key={i}
            className={cn("flex whitespace-pre", l.type === "add" && "bg-diff-add", l.type === "remove" && "bg-diff-remove")}
          >
            <span className="w-8 shrink-0 select-none text-end text-muted-foreground/70">{l.a ?? ""}</span>
            <span className="w-8 shrink-0 select-none text-end text-muted-foreground/70">{l.b ?? ""}</span>
            <span className="w-6 shrink-0 select-none text-center text-muted-foreground">{l.type === "add" ? "+" : l.type === "remove" ? "−" : ""}</span>
            <span className="pe-4">{l.text}</span>
          </div>
        ) : keep.has(i - 1) ? (
          <div key={i} className="select-none px-4 text-muted-foreground/60">
            ⋯
          </div>
        ) : null,
      )}
    </pre>
  );
}

export function ChangesPanel({ project }: { project: Project }) {
  const { t, revertChange, lang } = useApp();
  const [open, setOpen] = useState<string | null>(project.changes.at(-1)?.id ?? null);
  const changes = [...project.changes].reverse();
  if (!changes.length) return <EmptyState icon={<GitCompare />} title={t("noChanges")} body={t("noChangesBody")} />;
  return (
    <ul className="h-full space-y-3 overflow-y-auto p-3 sm:p-4">
      {changes.map((c) => {
        const s = diffStats(diffLines(c.before ?? "", c.after));
        const isOpen = open === c.id;
        return (
          <li key={c.id} className={cn("panel overflow-hidden", c.reverted && "opacity-60")}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2">
              <button className="flex min-h-11 min-w-0 items-center gap-2 text-start" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", !isOpen && "-rotate-90 rtl:rotate-90")} />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[13px]" dir="ltr">
                    {c.path}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    <span className="text-success">+{s.add}</span> <span className="text-destructive">−{s.remove}</span> · {formatDate(c.createdAt, lang)}
                    {c.reverted && ` · ${t("reverted")}`}
                  </span>
                </span>
              </button>
              {!c.reverted && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    if (revertChange(project.id, c.id)) toast.success(t("reverted"));
                    else toast.error(t("revertConflict"));
                  }}
                >
                  <Undo2 /> {t("revert")}
                </Button>
              )}
            </div>
            {isOpen && (
              <div className="border-t border-border">
                <DiffBlock change={c} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LogsPanel({ project }: { project: Project }) {
  const { t } = useApp();
  if (!project.logs.length) return <EmptyState icon={<ScrollText />} title={t("noLogs")} />;
  return (
    <ol className="h-full overflow-y-auto bg-card p-3 font-mono text-[12.5px] leading-6" dir="ltr" aria-label={t("logs")}>
      {[...project.logs].reverse().map((l) => (
        <li key={l.id} className="flex gap-3 border-b border-border/60 py-1 last:border-0">
          <time className="shrink-0 text-muted-foreground">{new Date(l.createdAt).toLocaleTimeString("en-GB")}</time>
          <span className={cn("w-12 shrink-0 uppercase", l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-warning" : "text-muted-foreground")}>{l.level}</span>
          <span className="min-w-0 break-words">{l.text}</span>
        </li>
      ))}
    </ol>
  );
}
