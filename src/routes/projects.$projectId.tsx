import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Code2, Eye, FileQuestion, FolderTree, GitCompare, MessageSquare, ScrollText } from "lucide-react";
import { Brand, DemoBadge, EmptyState, LangToggle, RequireSession, UserMenu } from "@/components/forge/common";
import { StatusBadge } from "@/components/forge/status";
import { ChatPanel } from "@/components/forge/workspace/ChatPanel";
import { PreviewPanel } from "@/components/forge/workspace/PreviewPanel";
import { CodePanel, modifiedPaths } from "@/components/forge/workspace/CodePanel";
import { ChangesPanel, LogsPanel } from "@/components/forge/workspace/ChangesPanel";
import { Button } from "@/components/ui/button";
import { projectStatus, useApp, type Project } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { TKey } from "@/lib/i18n";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Workspace — ForgeFE" },
      { name: "description", content: "Chat with the builder, preview your site and review code changes." },
      { property: "og:title", content: "Workspace — ForgeFE" },
      { property: "og:description", content: "Chat with the builder, preview your site and review code changes." },
    ],
  }),
  component: () => (
    <RequireSession>
      <Workspace />
    </RequireSession>
  ),
});

type View = "chat" | "preview" | "code" | "changes" | "logs";

function useIsDesktop() {
  const [d, setD] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const f = () => setD(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  return d;
}

function MainView({ view, project, compact }: { view: View; project: Project; compact: boolean }) {
  if (view === "code") return <CodePanel project={project} compact={compact} />;
  if (view === "changes") return <ChangesPanel project={project} />;
  if (view === "logs") return <LogsPanel project={project} />;
  return <PreviewPanel project={project} />;
}

function Workspace() {
  const { projectId } = Route.useParams();
  const { projects, t, isRunning } = useApp();
  const project = projects.find((p) => p.id === projectId);
  const desktop = useIsDesktop();
  const [view, setView] = useState<View>("preview");

  useEffect(() => {
    if (project) document.title = `${project.name} — ForgeFE`;
  }, [project?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project)
    return (
      <div className="grid min-h-app place-items-center">
        <EmptyState
          icon={<FileQuestion />}
          title={t("projectNotFound")}
          action={
            <Button asChild>
              <Link to="/dashboard">{t("backToProjects")}</Link>
            </Button>
          }
        />
      </div>
    );

  const modCount = modifiedPaths(project).size;
  const tabs: [View, TKey, typeof Eye][] = [
    ["preview", "preview", Eye],
    ["code", "code", Code2],
    ["changes", "changes", GitCompare],
    ["logs", "logs", ScrollText],
  ];
  const mobileTabs: [View, TKey, typeof Eye][] = [
    ["chat", "chat", MessageSquare],
    ["preview", "preview", Eye],
    ["code", "files", FolderTree],
    ["changes", "changes", GitCompare],
    ["logs", "logs", ScrollText],
  ];
  const current = desktop && view === "chat" ? "preview" : view;

  return (
    <div className="flex h-app flex-col overflow-hidden">
      <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-2 sm:px-3 lg:grid-cols-[360px_minmax(0,1fr)_auto]">
        <div className="flex min-w-0 items-center gap-1">
          <Button asChild variant="ghost" size="icon-touch" aria-label={t("backToProjects")}>
            <Link to="/dashboard">
              <ArrowLeft className="rtl:rotate-180" />
            </Link>
          </Button>
          <Link to="/dashboard" className="hidden shrink-0 sm:block" aria-label="ForgeFE">
            <Brand compact />
          </Link>
          <div className="ms-2 flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold">{project.name}</h1>
            <StatusBadge status={projectStatus(project, isRunning(project.id))} />
          </div>
        </div>
        {desktop && (
          <nav role="tablist" aria-label={t("workspaceTabs")} className="flex items-center gap-1">
            {tabs.map(([v, k, I]) => (
              <button
                key={v}
                role="tab"
                aria-selected={current === v}
                onClick={() => setView(v)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
                  current === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <I className="h-4 w-4" /> {t(k)}
                {v === "changes" && modCount > 0 && (
                  <span className="rounded-sm bg-highlight px-1.5 text-[11px] font-semibold text-highlight-foreground">{modCount}</span>
                )}
              </button>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-1">
          <DemoBadge className="hidden xl:inline-flex" />
          <LangToggle className="hidden sm:inline-flex" />
          <UserMenu />
        </div>
      </header>

      {desktop ? (
        <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)]">
          <aside className="min-h-0 border-e border-border bg-sidebar">
            <ChatPanel project={project} />
          </aside>
          <main className="min-h-0" role="tabpanel">
            <MainView view={current} project={project} compact={false} />
          </main>
        </div>
      ) : (
        <>
          <main className="min-h-0 flex-1">
            {view === "chat" ? <ChatPanel project={project} /> : <MainView view={view} project={project} compact />}
          </main>
          <nav aria-label={t("workspaceTabs")} className="grid shrink-0 grid-cols-5 border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
            {mobileTabs.map(([v, k, I]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-current={view === v ? "page" : undefined}
                className={cn("relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]", view === v ? "text-foreground" : "text-muted-foreground")}
              >
                {view === v && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-foreground" aria-hidden />}
                <I className="h-5 w-5" />
                <span className="truncate">{t(k)}</span>
                {v === "changes" && modCount > 0 && <span className="absolute end-[22%] top-2 h-2 w-2 rounded-full bg-highlight-border" aria-hidden />}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
