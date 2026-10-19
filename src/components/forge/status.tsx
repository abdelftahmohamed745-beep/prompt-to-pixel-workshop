import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

export function formatDate(ts: number, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(ts);
}

export function StatusBadge({ status }: { status: "running" | "edited" | "draft" }) {
  const { t } = useApp();
  const label = status === "running" ? t("statusRunning") : status === "edited" ? t("statusEdited") : t("statusDraft");
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        status === "running" && "border-highlight-border bg-highlight text-highlight-foreground",
        status === "edited" && "border-border bg-secondary text-foreground",
        status === "draft" && "border-border text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
