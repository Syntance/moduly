"use client";

import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  description?: string;
};

export function OgImageField({ label, value, onChange, description }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div
        className={cn(
          "relative flex size-28 items-center justify-center rounded-lg border border-dashed border-input bg-muted/30",
        )}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="size-full rounded-lg object-cover" />
            <button
              type="button"
              aria-label="Usuń obraz"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </>
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      {description ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
