import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUp, Check, CircleAlert, CircleSlash, Info, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApp, type Project, type TaskStatus } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/i18n";

const steps: [TaskStatus, TKey][] = [
  ["planning", "taskPlanning"],
  ["editing", "taskEditing"],
  ["testing", "taskTesting"],
  ["done", "taskDone"],
];

export function TaskStatusBar({ project }: { project: Project }) {
  const { t } = useApp();
  const task = project.tasks.at(-1);
  if (!task) return null;
  const idx = steps.findIndex(([s]) => s === task.status);
  const terminal = task.status === "stopped" || task.status === "error";
  return (
    <div className="border-t border-border px-4 py-3" aria-live="polite">
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow">{t("taskStatus")}</span>
        {terminal && (
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", task.status === "error" ? "text-destructive" : "text-muted-foreground")}>
            {task.status === "error" ? <CircleAlert className="h-3.5 w-3.5" /> : <CircleSlash className="h-3.5 w-3.5" />}
            {task.status === "error" ? t("taskError") : t("taskStopped")}
          </span>
        )}
      </div>
      <ol className="grid grid-cols-4 gap-1.5">
        {steps.map(([s, k], i) => {
          const active = i === idx && s !== "done";
          const complete = !terminal && (i < idx || task.status === "done");
          return (
            <li key={s} className="min-w-0">
              <div className={cn("h-1 rounded-full", complete ? "bg-foreground" : active ? "bg-highlight-border" : "bg-border")} />
              <div className={cn("mt-1.5 flex items-center gap-1 truncate text-[11px]", active || complete ? "text-foreground" : "text-muted-foreground")}>
                {active && <Loader2 className="h-3 w-3 shrink-0 animate-spin" />}
                {complete && <Check className="h-3 w-3 shrink-0" />}
                <span className="truncate">{t(k)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ChatPanel({ project }: { project: Project }) {
  const { t, runTask, stopTask, isRunning } = useApp();
  const [text, setText] = useState("");
  const running = isRunning(project.id);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [project.messages.length]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const v = text.trim();
    if (!v || running) return;
    runTask(project.id, v);
    setText("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-2 border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("demoAssistantNote")}
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" role="log" aria-label={t("chat")}>
        {project.messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("chatEmpty")}</p>}
        {project.messages.map((m, i) => (
          <div key={m.id} className={cn("flex flex-col", m.role === "user" ? "items-end" : "items-start")}>
            <span className="mb-1 text-[11px] text-muted-foreground">
              {i === 0 && m.role === "user" ? t("originalPrompt") : m.role === "user" ? t("you") : t("assistant")}
            </span>
            <div
              className={cn(
                "max-w-[90%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm",
                m.role === "user" ? "bg-primary text-primary-foreground" : "border border-border bg-card",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <TaskStatusBar project={project} />
      <form onSubmit={submit} className="border-t border-border p-3">
        <div className="rounded-lg border border-input bg-card focus-within:border-foreground">
          <label htmlFor="composer" className="sr-only">
            {t("composerPlaceholder")}
          </label>
          <Textarea
            id="composer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            }}
            placeholder={t("composerPlaceholder")}
            rows={2}
            disabled={running}
            className="max-h-40 min-h-16 resize-none border-0 bg-transparent text-[15px] shadow-none focus-visible:ring-0 focus-visible:outline-none"
          />
          <div className="flex items-center justify-end gap-2 p-1.5">
            {running ? (
              <Button type="button" variant="outline" size="touch" onClick={() => stopTask(project.id)}>
                <Square className="fill-current" /> {t("stop")}
              </Button>
            ) : (
              <Button type="submit" size="icon-touch" disabled={!text.trim()} aria-label={t("send")}>
                <ArrowUp />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
