import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import { BarChart3, Bot, Languages, LayoutPanelLeft, Palette, PlugZap, User } from "lucide-react";
import { toast } from "sonner";
import { AppHeader, FieldError, RequireSession, isEmail } from "@/components/forge/common";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useApp, type Theme, type Viewport } from "@/lib/store";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Section = "profile" | "appearance" | "language" | "workspace" | "ai" | "usage";
const sections: [Section, TKey, typeof User][] = [
  ["profile", "profile", User],
  ["appearance", "appearance", Palette],
  ["language", "langDir", Languages],
  ["workspace", "workspace", LayoutPanelLeft],
  ["ai", "aiProvider", Bot],
  ["usage", "usage", BarChart3],
];

export const Route = createFileRoute("/settings")({
  validateSearch: (s: Record<string, unknown>): { section?: Section } => ({
    section: sections.some(([k]) => k === s.section) ? (s.section as Section) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Settings — ForgeFE" },
      { name: "description", content: "Manage your ForgeFE profile, appearance, language and workspace preferences." },
      { property: "og:title", content: "Settings — ForgeFE" },
      { property: "og:description", content: "Manage profile, appearance, language and workspace preferences." },
    ],
  }),
  component: () => (
    <RequireSession>
      <Settings />
    </RequireSession>
  ),
});

function Card({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function OptionList<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-3">
      {options.map(([v, l]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "flex min-h-12 items-center gap-2 rounded-md border px-3 text-start text-sm",
            value === v ? "border-foreground bg-secondary font-medium" : "border-border hover:bg-accent",
          )}
        >
          <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full border", value === v ? "border-foreground bg-highlight" : "border-input")} aria-hidden />
          {l}
        </button>
      ))}
    </div>
  );
}

function Settings() {
  const app = useApp();
  const { t } = app;
  const { section = "profile" } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="min-h-app">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("settings")}</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label={t("settings")} className="-mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
            {sections.map(([k, label, I]) => (
              <button
                key={k}
                onClick={() => navigate({ search: { section: k }, replace: true })}
                aria-current={section === k ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm",
                  section === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <I className="h-4 w-4" /> {t(label)}
              </button>
            ))}
          </nav>
          <div className="min-w-0 space-y-4">
            {section === "profile" && <ProfileSection />}
            {section === "appearance" && (
              <Card title={t("theme")} desc={t("savedLocally")}>
                <OptionList<Theme>
                  label={t("theme")}
                  value={app.theme}
                  onChange={app.setTheme}
                  options={[
                    ["light", t("themeLight")],
                    ["dark", t("themeDark")],
                    ["system", t("themeSystem")],
                  ]}
                />
              </Card>
            )}
            {section === "language" && (
              <Card title={t("langDir")} desc={t("savedLocally")}>
                <OptionList
                  label={t("language")}
                  value={app.lang}
                  onChange={app.setLang}
                  options={[
                    ["ar", t("langArabic")],
                    ["en", t("langEnglish")],
                  ]}
                />
              </Card>
            )}
            {section === "workspace" && (
              <Card title={t("workspace")} desc={t("savedLocally")}>
                <div className="space-y-5">
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-center">
                    <Label htmlFor="vp">{t("defaultViewport")}</Label>
                    <Select value={app.prefs.defaultViewport} onValueChange={(v) => app.setPrefs({ defaultViewport: v as Viewport })}>
                      <SelectTrigger id="vp" className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desktop">{t("desktop")}</SelectItem>
                        <SelectItem value="tablet">{t("tablet")}</SelectItem>
                        <SelectItem value="mobile">{t("mobile")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
                    {t("lineNumbers")}
                    <Switch checked={app.prefs.lineNumbers} onCheckedChange={(v) => app.setPrefs({ lineNumbers: v })} />
                  </label>
                  <label className="flex min-h-11 items-center justify-between gap-4 text-sm">
                    {t("wrapCode")}
                    <Switch checked={app.prefs.wrap} onCheckedChange={(v) => app.setPrefs({ wrap: v })} />
                  </label>
                </div>
              </Card>
            )}
            {section === "ai" && <AiSection />}
            {section === "usage" && <UsageSection />}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileSection() {
  const { t, profile, session, setProfile } = useApp();
  const [name, setName] = useState(profile.name || session?.name || "");
  const [email, setEmail] = useState(profile.email || session?.email || "");
  const [errs, setErrs] = useState<{ name?: string; email?: string }>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n: typeof errs = {};
    if (!name.trim()) n.name = t("errName");
    if (!isEmail(email)) n.email = t("errEmail");
    setErrs(n);
    if (Object.keys(n).length) return;
    setProfile({ name: name.trim(), email: email.trim() });
    toast.success(t("profileSaved"));
  };
  return (
    <Card title={t("profile")} desc={t("savedLocally")}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pf-name">{t("fullName")}</Label>
          <Input id="pf-name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errs.name} />
          <FieldError id="pf-name-err" msg={errs.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pf-email">{t("email")}</Label>
          <Input id="pf-email" className="h-11" dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errs.email} />
          <FieldError id="pf-email-err" msg={errs.email} />
        </div>
        <Button type="submit" size="touch">
          {t("save")}
        </Button>
      </form>
    </Card>
  );
}

function AiSection() {
  const { t } = useApp();
  const [provider, setProvider] = useState("none");
  return (
    <Card title={t("aiProvider")}>
      <div className="mb-5 flex items-start gap-3 rounded-md border border-border bg-secondary p-3 text-sm">
        <PlugZap className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <span className="me-2 inline-flex rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium">{t("notConnected")}</span>
          {t("aiProviderBody")}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="prov">{t("provider")}</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="prov" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="google">Google Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="model">{t("model")}</Label>
          <Input id="model" className="h-11" disabled placeholder="—" />
        </div>
      </div>
      <Button className="mt-5" size="touch" variant="outline" disabled={provider === "none"} onClick={() => toast.info(t("connectUnavailable"))}>
        {t("connect")}
      </Button>
    </Card>
  );
}

function UsageSection() {
  const { t, projects, resetData } = useApp();
  const tasks = projects.reduce((n, p) => n + p.tasks.length, 0);
  const changes = projects.reduce((n, p) => n + p.changes.length, 0);
  return (
    <>
      <Card title={t("usage")} desc={t("usageBody")}>
        <dl className="grid grid-cols-3 divide-x divide-border rounded-md border border-border rtl:divide-x-reverse">
          {[
            [t("localProjects"), projects.length],
            [t("demoTasks"), tasks],
            [t("demoChanges"), changes],
          ].map(([l, v]) => (
            <div key={l as string} className="min-w-0 p-3">
              <dt className="truncate text-xs text-muted-foreground">{l}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card title={t("dangerZone")} desc={t("resetBody")}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="touch">
              {t("resetData")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>{t("resetData")}</AlertDialogTitle>
              <AlertDialogDescription>{t("resetBody")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel className="h-11">{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className={buttonVariants({ variant: "destructive", size: "touch" })}
                onClick={() => {
                  resetData();
                  toast.success(t("resetDone"));
                }}
              >
                {t("resetData")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </>
  );
}
