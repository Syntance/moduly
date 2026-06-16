"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { cmsInputClass, CmsFieldset } from "./cms-field";

type Props = {
  pageLabel: string;
};

export function PageContentEditor({ pageLabel }: Props) {
  return (
    <form
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <CmsFieldset title="Hero">
        <input type="text" defaultValue={`${pageLabel} — Outdoor Store`} placeholder="Nagłówek" className={`h-10 ${cmsInputClass}`} />
        <textarea
          rows={3}
          defaultValue="Odkryj kolekcję na każdą pogodę. Sprawdzone materiały, szybka wysyłka, zwrot do 30 dni."
          placeholder="Opis"
          className={cmsInputClass}
        />
        <input type="text" defaultValue="Zobacz kolekcję" placeholder="Etykieta CTA" className={`h-10 ${cmsInputClass}`} />
        <input type="text" defaultValue="/sklep" placeholder="Link CTA" className={`h-10 ${cmsInputClass}`} />
      </CmsFieldset>

      <CmsFieldset title="Sekcja CTA">
        <input type="text" defaultValue="Gotowy na wyprawę?" placeholder="Nagłówek" className={`h-10 ${cmsInputClass}`} />
        <textarea rows={2} defaultValue="Dołącz do 12 000+ klientów, którzy nam zaufali." placeholder="Treść" className={cmsInputClass} />
      </CmsFieldset>

      <CmsFieldset
        title="FAQ"
        action={(
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1">
            <Plus className="size-4" aria-hidden />
            Dodaj pytanie
          </Button>
        )}
      >
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2">
            <span className="text-sm font-medium">Jak wybrać rozmiar?</span>
            <button
              type="button"
              aria-label="Usuń pytanie"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
          <textarea
            rows={2}
            defaultValue="Skorzystaj z naszego przewodnika po rozmiarach lub napisz do nas — pomożemy w 24h."
            className={cmsInputClass}
          />
        </div>
      </CmsFieldset>

      <Button type="submit" className="h-10 w-fit gap-1.5">
        <Save className="size-4" aria-hidden />
        Zapisz treści
      </Button>
    </form>
  );
}
