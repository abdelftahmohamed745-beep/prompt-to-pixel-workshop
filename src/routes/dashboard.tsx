import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ArrowUp, Copy, ExternalLink, FolderOpen, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, EmptyState, RequireSession } from "@/components/forge/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RenameDialog, DeleteDialog } from "@/components/forge/project-dialogs";
import { StatusBadge, formatDate } from "@/components/forge/status";
import { projectStatus, useApp, type Project } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Projects — ForgeFE" },
      { name: "description", content: "Your ForgeFE projects: start a new website or continue a recent one." },
      { property: "og:title", content: "Projects — ForgeFE" },
      { property: "og:description", content: "Start a new website or continue a recent one." },
    ],
  }),
  component: () => (
    <RequireSession>
      <Dashboard />
    </RequireSession>
  ),
});

type Sort = "updated" | "created" | "name";

function Dashboard() {
  const { t, session, projects, loadError, resetData, isRunning, duplicateProject, lang } = useApp();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("updated");
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = projects.filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle));
    return [...filtered].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name, lang) : sort === "created" ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt,
    );
  }, [projects, q, sort, lang]);

  const submitPrompt = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/projects/new", search: { prompt: prompt.trim() || undefined } });
  };

  return (
    <div className="min-h-app">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{t("welcome", { name: session?.name ?? "" })}</h1>
            <p className="mt-1 text-muted-foreground">{t("welcomeSub")}</p>
          </div>
          <Button asChild variant="highlight" size="touch" className="self-start sm:self-auto">
            <Link to="/projects/new">
              <Plus /> {t("newProject")}
            </Link>
          </Button>
        </div>

        <form onSubmit={submitPrompt} className="panel mt-6 p-2 focus-within:ring-2 focus-within:ring-ring/30">
          <label htmlFor="home-prompt" className="sr-only">
            {t("promptLabel")}
          </label>
          <Textarea
            id="home-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitPrompt(e);
            }}
            placeholder={t("promptPlaceholder")}
            rows={4}
            className="min-h-28 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-end gap-2 px-2 pb-1">
            <Button type="submit" size="touch">
              {t("startBuilding")} <ArrowUp />
            </Button>
          </div>
        </form>

        <section className="mt-12" aria-labelledby="recent-h">
          <div className="grid grid-cols-1 gap-3 sm:flex sm:items-center sm:justify-between">
            <h2 id="recent-h" className="text-lg font-semibold">
              {t("recentProjects")}
            </h2>
            <div className="flex min-w-0 gap-2">
              <div className="relative min-w-0 flex-1 sm:w-64">
                <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchProjects")} aria-label={t("searchProjects")} className="h-11 ps-9" />
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger className="h-11 w-36 shrink-0" aria-label={t("sortBy")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">{t("sortUpdated")}</SelectItem>
                  <SelectItem value="created">{t("sortCreated")}</SelectItem>
                  <SelectItem value="name">{t("sortName")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="panel mt-4 overflow-hidden">
            {loadError ? (
              <EmptyState
                icon={<AlertTriangle />}
                title={t("loadError")}
                body={t("loadErrorBody")}
                action={
                  <Button variant="outline" onClick={resetData}>
                    {t("resetData")}
                  </Button>
                }
              />
            ) : list.length === 0 ? (
              q ? (
                <EmptyState
                  icon={<Search />}
                  title={t("noResults", { q })}
                  action={
                    <Button variant="outline" onClick={() => setQ("")}>
                      <X /> {t("clearSearch")}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<FolderOpen />}
                  title={t("noProjects")}
                  body={t("noProjectsBody")}
                  action={
                    <Button asChild variant="highlight">
                      <Link to="/projects/new">
                        <Plus /> {t("newProject")}
                      </Link>
                    </Button>
                  }
                />
              )
            ) : (
              <ul className="divide-y divide-border">
                {list.map((p) => (
                  <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-accent/60">
                    <Link to="/projects/$projectId" params={{ projectId: p.id }} className="min-w-0 rounded-sm py-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{p.name}</span>
                        <StatusBadge status={projectStatus(p, isRunning(p.id))} />
                      </div>
                      <div className="mt-0.5 truncate text-sm text-muted-foreground">
                        {t("updated", { date: formatDate(p.updatedAt, lang) })} · {p.description}
                      </div>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-touch" aria-label={`${t("projectActions")}: ${p.name}`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="h-10" onSelect={() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } })}>
                          <ExternalLink /> {t("open")}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10" onSelect={() => setRenaming(p)}>
                          <Pencil /> {t("rename")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="h-10"
                          onSelect={() => {
                            duplicateProject(p.id);
                            toast.success(t("duplicated"));
                          }}
                        >
                          <Copy /> {t("duplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="h-10 text-destructive focus:text-destructive" onSelect={() => setDeleting(p)}>
                          <Trash2 /> {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <RenameDialog project={renaming} onClose={() => setRenaming(null)} />
      <DeleteDialog project={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
