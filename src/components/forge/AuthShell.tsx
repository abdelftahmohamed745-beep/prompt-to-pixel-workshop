import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Brand, LangToggle } from "./common";
import { useApp } from "@/lib/store";

export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  const { t } = useApp();
  return (
    <div className="grid min-h-app lg:grid-cols-[1fr_minmax(0,520px)]">
      <aside className="relative hidden flex-col justify-between border-e border-border bg-primary p-10 text-primary-foreground lg:flex">
        <Brand />
        <div className="max-w-md">
          <p className="eyebrow !text-primary-foreground/60">{t("brandTag")}</p>
          <p className="mt-4 text-3xl font-semibold leading-tight tracking-tight">
            {t("welcomeSub")}
          </p>
          <div className="mt-8 h-1 w-12 rounded-full bg-highlight" aria-hidden />
        </div>
        <p className="text-xs text-primary-foreground/60">© ForgeFE</p>
      </aside>
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link to="/login" className="lg:invisible" aria-label="ForgeFE">
            <Brand />
          </Link>
          <LangToggle />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {sub && <p className="mt-1.5 text-muted-foreground">{sub}</p>}
          <div className="mt-8">{children}</div>
          <p className="mt-8 flex gap-2 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("demoAuthNote")}
          </p>
        </div>
      </main>
    </div>
  );
}
