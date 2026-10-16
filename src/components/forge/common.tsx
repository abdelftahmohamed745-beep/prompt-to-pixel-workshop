import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Eye, EyeOff, Languages, LogOut, Settings, FolderKanban, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight" dir="ltr">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
        F
      </span>
      {!compact && (
        <span className="text-[15px]">
          Forge<span className="text-muted-foreground">FE</span>
        </span>
      )}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  const { t } = useApp();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
      {t("demoBadge")}
    </span>
  );
}

export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useApp();
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-9", className)}
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      aria-label={t("language")}
    >
      <Languages />
      <span>{t("switchLang")}</span>
    </Button>
  );
}

export function FullLoader() {
  return (
    <div className="grid min-h-app place-items-center" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Client-side demo guard. Not real security — there is no auth server. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { ready, session } = useApp();
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !session) navigate({ to: "/login", replace: true });
  }, [ready, session, navigate]);
  if (!ready || !session) return <FullLoader />;
  return <>{children}</>;
}

export function UserMenu() {
  const { session, t, signOut } = useApp();
  const navigate = useNavigate();
  const initial = (session?.name || session?.email || "?").trim().charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" aria-label={t("account")}>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-secondary text-sm font-semibold">
            {initial}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{session?.name}</div>
          <div className="truncate text-xs text-muted-foreground">{session?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10" onSelect={() => navigate({ to: "/dashboard" })}>
          <FolderKanban /> {t("projects")}
        </DropdownMenuItem>
        <DropdownMenuItem className="h-10" onSelect={() => navigate({ to: "/settings" })}>
          <Settings /> {t("settings")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="h-10"
          onSelect={() => {
            signOut();
            navigate({ to: "/login" });
          }}
        >
          <LogOut /> {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader() {
  const { t } = useApp();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/dashboard" className="rounded-md" aria-label="ForgeFE">
          <Brand />
        </Link>
        <nav className="ms-4 hidden items-center gap-1 sm:flex" aria-label="Main">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            {t("projects")}
          </Link>
          <Link
            to="/settings"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            activeProps={{ className: "bg-secondary text-foreground" }}
          >
            {t("settings")}
          </Link>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <DemoBadge className="hidden md:inline-flex" />
          <LangToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

export function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  const { t } = useApp();
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className={cn("h-11 pe-11", props.className)} />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 end-0 grid w-11 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label={show ? t("hidePassword") : t("showPassword")}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="text-[13px] text-destructive" role="alert">
      {msg}
    </p>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-md border border-border bg-card text-muted-foreground [&_svg]:h-5 [&_svg]:w-5">
        {icon}
      </div>
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
