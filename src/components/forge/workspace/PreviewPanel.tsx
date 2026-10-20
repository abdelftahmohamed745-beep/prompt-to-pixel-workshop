import { useMemo, useState } from "react";
import { ExternalLink, FileX, Monitor, RotateCw, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "../common";
import { useApp, type Project, type Viewport } from "@/lib/store";
import { composePreview } from "@/lib/templates";
import { cn } from "@/lib/utils";

const widths: Record<Viewport, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

export function PreviewPanel({ project }: { project: Project }) {
  const { t, prefs } = useApp();
  const [vp, setVp] = useState<Viewport>(prefs.defaultViewport);
  const [nonce, setNonce] = useState(0);
  const doc = useMemo(() => composePreview(project.files), [project.files]);

  const openTab = () => {
    if (!doc) return;
    const url = URL.createObjectURL(new Blob([doc], { type: "text/html" }));
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const icons = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        <ToggleGroup type="single" value={vp} onValueChange={(v) => v && setVp(v as Viewport)} aria-label={t("viewport")} className="gap-0.5">
          {(Object.keys(widths) as Viewport[]).map((v) => {
            const I = icons[v];
            return (
              <Tooltip key={v}>
                <TooltipTrigger asChild>
                  <ToggleGroupItem value={v} aria-label={t(v)} className="h-9 w-10 data-[state=on]:bg-highlight data-[state=on]:text-highlight-foreground">
                    <I className="h-4 w-4" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>{t(v)}</TooltipContent>
              </Tooltip>
            );
          })}
        </ToggleGroup>
        <span className="hidden truncate text-xs text-muted-foreground sm:inline" dir="ltr">
          {widths[vp]}
        </span>
        <div className="ms-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setNonce((n) => n + 1)} aria-label={t("refresh")} disabled={!doc}>
            <RotateCw />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={openTab} aria-label={t("openNewTab")} disabled={!doc}>
            <ExternalLink className="rtl:-scale-x-100" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-secondary p-0 sm:p-4">
        {doc ? (
          <div
            className={cn("mx-auto h-full min-h-[480px] overflow-hidden bg-card", vp !== "desktop" && "border border-border sm:rounded-md shadow-float")}
            style={{ width: widths[vp], maxWidth: vp === "desktop" ? undefined : "100%" }}
          >
            <iframe key={nonce} title={`${t("preview")}: ${project.name}`} srcDoc={doc} sandbox="" className="h-full w-full border-0" />
          </div>
        ) : (
          <EmptyState icon={<FileX />} title={t("noFiles")} />
        )}
      </div>
    </div>
  );
}
