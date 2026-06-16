"use client";

import { Rocket } from "lucide-react";
import { Button } from "@/components/ui";

export function CmsRedeployButton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-relaxed text-muted-foreground">
        <strong className="font-medium text-foreground">Zapis</strong> publikuje tekst od razu (bez
        redeploy).{" "}
        <strong className="font-medium text-foreground">Redeploy</strong> synchronizuje zdjęcia z CMS
        do buildu (PageSpeed).
      </p>
      <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="gap-1.5 border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive hover:bg-destructive hover:text-white"
        >
          <Rocket className="size-4" aria-hidden />
          Redeploy
        </Button>
      </div>
    </div>
  );
}
