"use client";

import { GripVertical, ImageIcon, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cmsInputClass, CmsFieldset } from "./cms-field";
import { cmsInstagramDemo, cmsPartnerzyDemo } from "@/lib/cms-data";

export function GlobalContentEditor() {
  return (
    <form
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <CmsFieldset
        title="Pasek informacyjny"
        hint="Tekst publikuje się od razu po zapisie. Zdjęcia — po przycisku Redeploy u góry."
      >
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked className="size-4" />
          Włączony
        </label>
        <input type="text" defaultValue="Darmowa dostawa od 299 zł" placeholder="Tekst paska" className={`h-10 ${cmsInputClass}`} />
      </CmsFieldset>

      <CmsFieldset title="Trust bar">
        <input type="text" defaultValue="12 400+" placeholder="Obserwujący" className={`h-10 ${cmsInputClass}`} />
        <input type="text" defaultValue="2 800+" placeholder="Realizacje" className={`h-10 ${cmsInputClass}`} />
        <input type="text" defaultValue="Wysyłka 24–48h" placeholder="Label wysyłki" className={`h-10 ${cmsInputClass}`} />
      </CmsFieldset>

      <CmsFieldset title="Checkout callout (PDP)">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked className="size-4" />
          Włączony
        </label>
        <input type="text" defaultValue="Bezpieczna płatność" placeholder="Nagłówek" className={`h-10 ${cmsInputClass}`} />
        <textarea
          rows={3}
          defaultValue="Zamów do 14:00 — wyślemy jeszcze dziś. Zwrot do 30 dni bez pytań."
          placeholder="Treść"
          className={cmsInputClass}
        />
      </CmsFieldset>

      <CmsFieldset title="Stopka i social media">
        <textarea
          rows={2}
          defaultValue="© 2026 Outdoor Store. Wszystkie prawa zastrzeżone."
          placeholder="Tekst copyright w stopce (opcjonalnie)"
          className={cmsInputClass}
        />
        <input type="url" defaultValue="https://instagram.com/outdoorstore" placeholder="Instagram URL" className={`h-10 ${cmsInputClass}`} />
        <input type="url" defaultValue="https://facebook.com/outdoorstore" placeholder="Facebook URL" className={`h-10 ${cmsInputClass}`} />
        <input type="url" placeholder="TikTok URL (opcjonalnie)" className={`h-10 ${cmsInputClass}`} />
      </CmsFieldset>

      <CmsFieldset
        title="Partnerzy (HP)"
        action={(
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1">
            <Plus className="size-4" aria-hidden />
            Dodaj
          </Button>
        )}
      >
        <ul className="divide-y divide-border rounded-lg border border-border">
          {cmsPartnerzyDemo.map((logo) => (
            <li key={logo.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40">
                {logo.hasLogo ? (
                  <span className="text-xs font-medium text-muted-foreground">LOGO</span>
                ) : (
                  <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{logo.name}</p>
                <p className="truncate text-xs text-muted-foreground">{logo.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label={`Edytuj ${logo.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Pencil className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Usuń ${logo.name}`}
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-destructive/30"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </CmsFieldset>

      <CmsFieldset
        title="Instagram (HP, max 6)"
        hint="Układ jak na stronie głównej (3×2 / 1×6). Przeciągnij kafelek za uchwyt, aby zmienić kolejność."
      >
        <div className="grid max-w-xl grid-cols-3 gap-2 sm:grid-cols-6">
          {cmsInstagramDemo.map((tile) => (
            <div
              key={tile.id}
              className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30"
            >
              <span className="absolute top-1 left-1 rounded bg-background/90 px-1 text-[10px] font-medium tabular-nums text-muted-foreground">
                {tile.order}
              </span>
              <GripVertical className="absolute top-1 right-1 size-3.5 text-muted-foreground/70" aria-hidden />
              <ImageIcon className="size-5 text-muted-foreground/50" aria-hidden />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Kliknij kafelek na siatce, aby edytować URL i zdjęcie.</p>
      </CmsFieldset>

      <Button type="submit" className="h-10 w-fit gap-1.5">
        <Save className="size-4" aria-hidden />
        Zapisz treści globalne
      </Button>
    </form>
  );
}
