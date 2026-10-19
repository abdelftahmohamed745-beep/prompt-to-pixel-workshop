import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/forge/AuthShell";
import { FieldError, GoogleButton, PasswordInput, isEmail } from "@/components/forge/auth-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — ForgeFE" },
      { name: "description", content: "Create a ForgeFE account and start building your first website." },
      { property: "og:title", content: "Create account — ForgeFE" },
      { property: "og:description", content: "Create a ForgeFE account and start building your first website." },
    ],
  }),
  component: Register,
});

type Errs = Partial<Record<"name" | "email" | "password" | "confirm", string>>;

function Register() {
  const { t, signIn } = useApp();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errs>({});
  const [done, setDone] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errs = {};
    if (!f.name.trim()) errs.name = t("errName");
    if (!isEmail(f.email)) errs.email = t("errEmail");
    if (f.password.length < 8) errs.password = t("errPassword");
    if (f.confirm !== f.password || !f.confirm) errs.confirm = t("errPasswordMatch");
    setErrors(errs);
    if (!Object.keys(errs).length) setDone(true);
  };

  if (done)
    return (
      <AuthShell title={t("registeredTitle")}>
        <div className="panel flex gap-3 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm">{t("registeredBody", { email: f.email })}</p>
        </div>
        <Button
          size="touch"
          className="mt-6 w-full"
          onClick={() => {
            signIn({ name: f.name.trim(), email: f.email.trim() }, true);
            navigate({ to: "/dashboard" });
          }}
        >
          {t("continueDashboard")}
        </Button>
      </AuthShell>
    );

  const field = (k: keyof typeof f, label: string, node: React.ReactNode) => (
    <div className="space-y-1.5">
      <Label htmlFor={k}>{label}</Label>
      {node}
      <FieldError id={`${k}-err`} msg={errors[k]} />
    </div>
  );
  const common = (k: keyof typeof f) => ({
    id: k,
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value }),
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });

  return (
    <AuthShell title={t("registerTitle")} sub={t("registerSub")}>
      <GoogleButton />
      <form onSubmit={submit} noValidate className="space-y-4">
        {field("name", t("fullName"), <Input {...common("name")} autoComplete="name" className="h-11" />)}
        {field("email", t("email"), <Input {...common("email")} type="email" dir="ltr" autoComplete="email" className="h-11" />)}
        {field("password", t("password"), <PasswordInput {...common("password")} dir="ltr" autoComplete="new-password" />)}
        {field("confirm", t("confirmPassword"), <PasswordInput {...common("confirm")} dir="ltr" autoComplete="new-password" />)}
        <Button type="submit" size="touch" className="w-full">
          {t("createAccount")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
          {t("signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
