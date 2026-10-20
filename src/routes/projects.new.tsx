import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { AppHeader, FieldError, RequireSession } from "@/components/forge/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/lib/store";
import type { Direction, SiteType } from "@/lib/templates";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/new")({
  validateSearch: (s: Record<string, unknown>): { prompt?: string } => ({
    prompt: typeof s.prompt === "string" ? s.prompt : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New project — ForgeFE" },
      { name: "description", content: "Describe a new website and set its starting preferences." },
      { property: "og:title", content: "New project — ForgeFE" },
      { property: "og:description", content: "Describe a new website and set its starting preferences." },
    ],
  }),
  component: () => (
    <RequireSession>
      <NewProject />
    </RequireSession>
  ),
});

const types: [SiteType, TKey][] = [
  ["landing", "typeLanding"],
  ["portfolio", "typePortfolio"],
  ["store", "typeStore"],
  ["blog", "typeBlog"],
];
const dirs: [Direction, TKey][] = [
  ["minimal", "dirMinimal"],
  ["editorial", "dirEditorial"],
  ["bold", "dirBold"],
];

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, TKey][]; onChange: (v: T) => void }) {
  const { t } = useApp();
  return (
    <fieldset>
      <legend className="text-sm font-medium">
        {label} <span className="font-normal text-muted-foreground">· {t("optional")}</span>
      </legend>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup">
        {options.map(([v, k]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "h-10 rounded-md border px-3.5 text-sm transition-colors",
              value === v ? "border-foreground bg-primary text-primary-foreground" : "border-border bg-card hover:bg-accent",
            )}
          >
            {t(k)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function NewProject() {
  const { t, createProject } = useApp();
  const { prompt } = Route.useSearch();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState(prompt ?? "");
  const [siteType, setSiteType] = useState<SiteType>("landing");
  const [direction, setDirection] = useState<Direction>("minimal");
  const [errs, setErrs] = useState<{ name?: string; description?: string }>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n: typeof errs = {};
    if (!name.trim() || name.trim().length > 60) n.name = t("errNameLen");
    if (description.trim().length < 10) n.description = t("errDescription");
    setErrs(n);
    if (Object.keys(n).length) return;
    const id = createProject({ name: name.trim(), description: description.trim(), siteType, direction });
    navigate({ to: "/projects/$projectId", params: { projectId: id } });
  };

  return (
    <div className="min-h-app">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
        <Link to="/dashboard" className="inline-flex h-10 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("backToProjects")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("newProjectTitle")}</h1>
        <p className="mt-1 flex gap-2 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> {t("newProjectSub")}
        </p>
        <form onSubmit={submit} noValidate className="panel mt-6 space-y-6 p-5 sm:p-6">
          <div className="space-y-1.5">
            <Label htmlFor="pname">{t("projectName")}</Label>
            <Input id="pname" className="h-11" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} aria-invalid={!!errs.name} aria-describedby={errs.name ? "pname-err" : undefined} />
            <FieldError id="pname-err" msg={errs.name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pdesc">{t("promptLabel")}</Label>
            <Textarea
              id="pdesc"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("promptPlaceholder")}
              aria-invalid={!!errs.description}
              aria-describedby={errs.description ? "pdesc-err" : undefined}
            />
            <FieldError id="pdesc-err" msg={errs.description} />
          </div>
          <Choice label={t("siteType")} value={siteType} options={types} onChange={setSiteType} />
          <Choice label={t("visualDirection")} value={direction} options={dirs} onChange={setDirection} />
          <div className="flex justify-end border-t border-border pt-5">
            <Button type="submit" variant="highlight" size="touch" className="w-full sm:w-auto">
              {t("createProject")}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
