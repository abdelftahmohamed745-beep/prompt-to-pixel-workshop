import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/components/forge/AuthShell";
import { FieldError, GoogleButton, PasswordInput, isEmail } from "@/components/forge/auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — ForgeFE" },
      { name: "description", content: "Sign in to ForgeFE to continue building your websites." },
      { property: "og:title", content: "Sign in — ForgeFE" },
      { property: "og:description", content: "Sign in to ForgeFE to continue building your websites." },
    ],
  }),
  component: Login,
});

function Login() {
  const { t, signIn, ready, session, profile } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) navigate({ to: "/dashboard", replace: true });
  }, [ready, session, navigate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!isEmail(email)) errs.email = t("errEmail");
    if (password.length < 8) errs.password = t("errPassword");
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    // Demo only: no credentials are verified anywhere.
    setTimeout(() => {
      const name = profile.email === email.trim() && profile.name ? profile.name : email.split("@")[0];
      signIn({ name, email: email.trim() }, remember);
      navigate({ to: "/dashboard" });
    }, 500);
  };

  return (
    <AuthShell title={t("signInTitle")} sub={t("signInSub")}>
      <GoogleButton />
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            dir="ltr"
            className="h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-err" : undefined}
          />
          <FieldError id="email-err" msg={errors.email} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("password")}</Label>
            <Link to="/forgot-password" className="text-[13px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {t("forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-err" : undefined}
          />
          <FieldError id="password-err" msg={errors.password} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          {t("rememberMe")}
        </label>
        <Button type="submit" size="touch" className="w-full" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}
          {busy ? t("signingIn") : t("signIn")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link to="/register" className="font-medium text-foreground underline underline-offset-4">
          {t("createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}
