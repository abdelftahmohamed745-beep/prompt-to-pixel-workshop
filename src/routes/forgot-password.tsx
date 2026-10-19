import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/forge/AuthShell";
import { FieldError, isEmail } from "@/components/forge/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — ForgeFE" },
      { name: "description", content: "Reset the password for your ForgeFE account." },
      { property: "og:title", content: "Reset password — ForgeFE" },
      { property: "og:description", content: "Reset the password for your ForgeFE account." },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<string>();
  const [sent, setSent] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(email)) return setErr(t("errEmail"));
    setErr(undefined);
    setSent(true);
  };

  return (
    <AuthShell title={sent ? t("resetSentTitle") : t("resetTitle")} sub={sent ? undefined : t("resetSub")}>
      {sent ? (
        <div className="panel flex gap-3 p-4">
          <MailCheck className="h-5 w-5 shrink-0" />
          <p className="text-sm">{t("resetSentBody", { email })}</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!err}
              aria-describedby={err ? "email-err" : undefined}
            />
            <FieldError id="email-err" msg={err} />
          </div>
          <Button type="submit" size="touch" className="w-full">
            {t("sendReset")}
          </Button>
        </form>
      )}
      <Button asChild variant="ghost" size="touch" className="mt-4 w-full">
        <Link to="/login">{t("backToSignIn")}</Link>
      </Button>
    </AuthShell>
  );
}
