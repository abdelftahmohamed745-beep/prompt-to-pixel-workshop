import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "./common";
import { useApp, type Project } from "@/lib/store";

export function RenameDialog({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const { t, renameProject } = useApp();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string>();
  useEffect(() => {
    if (project) {
      setName(project.name);
      setErr(undefined);
    }
  }, [project]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v || v.length > 60) return setErr(t("errNameLen"));
    renameProject(project!.id, v);
    toast.success(t("renamed"));
    onClose();
  };
  return (
    <Dialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t("renameTitle")}</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="rename">{t("projectName")}</Label>
            <Input id="rename" className="h-11" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err} autoFocus />
            <FieldError id="rename-err" msg={err} />
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" size="touch" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" size="touch">
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDialog({ project, onClose, onDeleted }: { project: Project | null; onClose: () => void; onDeleted?: () => void }) {
  const { t, deleteProject } = useApp();
  return (
    <AlertDialog open={!!project} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteTitle", { name: project?.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("deleteBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className="h-11">{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive", size: "touch" })}
            onClick={() => {
              if (!project) return;
              deleteProject(project.id);
              toast.success(t("deleted"));
              onClose();
              onDeleted?.();
            }}
          >
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
