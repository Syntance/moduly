"use client";

import Link from "next/link";
import { GripVertical, ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cmsInputClass } from "@/components/cms/cms-field";
import type { ProduktDemo } from "@/lib/data";
import { kategorieDemo } from "@/lib/data";

const inputClass = cmsInputClass;

type Props = {
  product: ProduktDemo;
};

const demoImages = ["main", "alt-1", "alt-2"] as const;

const demoFaq = [
  { id: "faq-1", question: "Jak dobrać rozmiar?", answer: "Skorzystaj z tabeli rozmiarów na stronie produktu lub napisz do nas." },
] as const;

export function ProductForm({ product }: Props) {
  const priceMajor = (product.cena / 100).toFixed(2);
  const published = product.status !== "niedostepny";

  return (
    <form
      className="grid gap-6 lg:grid-cols-[1fr_320px]"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Lewa kolumna — treść */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-title" className="text-sm font-medium">Nazwa</label>
          <input
            id="product-title"
            type="text"
            defaultValue={product.nazwa}
            placeholder="np. Kurtka zimowa Premium"
            className={`h-10 ${inputClass}`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Opis</span>
          <textarea
            rows={6}
            defaultValue={`${product.nazwa} — sprawdzona jakość na każdą pogodę. Materiał oddychający, szybkie schnięcie, wygodny krój.`}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Zdjęcia</span>
          <div className="flex flex-wrap gap-3 rounded-lg p-2">
            {demoImages.map((key, index) => (
              <div
                key={key}
                className={`relative size-24 overflow-hidden rounded-lg border bg-muted ${
                  index === 0 ? "border-primary ring-2 ring-primary/25" : "border-border"
                }`}
              >
                <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                  Zdjęcie
                </div>
                {index === 0 ? (
                  <span className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                    Główne
                  </span>
                ) : (
                  <span className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Przeciągnij zdjęcie ${index + 1}`}
                  className="absolute right-1 bottom-1 z-10 inline-flex size-6 cursor-grab items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm"
                >
                  <GripVertical className="size-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label="Usuń zdjęcie"
                  className="absolute top-1 right-1 z-10 grid size-6 place-items-center rounded-md bg-background/80 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
            <label className="grid size-24 cursor-pointer place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:bg-muted">
              <ImagePlus className="size-5" aria-hidden />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Przeciągnij uchwyt, aby zmienić kolejność. Pierwsze zdjęcie jest główne na sklepie.
            Nowe pliki możesz też upuścić na pole lub wybrać z dysku.
          </p>
        </div>

        {/* SEO — bez zakładek kolorów/pól */}
        <div className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-medium">SEO produktu</legend>
              <input type="text" defaultValue={`${product.nazwa} | Outdoor Store`} placeholder="Meta Title" className={`h-10 ${inputClass}`} />
              <textarea
                rows={3}
                defaultValue={`Kup ${product.nazwa} w Outdoor Store. Szybka wysyłka, zwrot do 30 dni.`}
                placeholder="Meta Description"
                className={inputClass}
              />
              <input type="text" defaultValue={product.nazwa} placeholder="OG Title" className={`h-10 ${inputClass}`} />
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">OG Image</span>
                <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-xs text-muted-foreground">
                  Przeciągnij zdjęcie lub wybierz plik
                </div>
              </div>
              <input type="url" defaultValue={`https://outdoorstore.pl/produkt/${product.slug}`} placeholder="Canonical URL" className={`h-10 ${inputClass}`} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4" />
                No Index
              </label>
            </fieldset>

            <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-medium">FAQ produktowe</legend>
              {demoFaq.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <input type="text" defaultValue={item.question} placeholder="Pytanie" className={`h-9 ${inputClass}`} />
                  <textarea rows={3} defaultValue={item.answer} placeholder="Odpowiedź" className={inputClass} />
                  <button type="button" className="inline-flex w-fit items-center gap-1 text-sm text-destructive">
                    <Trash2 className="size-3.5" aria-hidden />
                    Usuń
                  </button>
                </div>
              ))}
              <button type="button" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary">
                <Plus className="size-4" aria-hidden />
                Dodaj FAQ
              </button>
            </fieldset>
        </div>
      </div>

      {/* Prawa kolumna — ustawienia */}
      <aside className="flex h-fit flex-col gap-5 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-status" className="text-sm font-medium">Status</label>
          <select
            id="product-status"
            defaultValue={published ? "published" : "draft"}
            className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="draft">Szkic</option>
            <option value="published">Opublikowany</option>
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Kategorie</legend>
          <p className="text-xs text-muted-foreground">Produkt może być widoczny w wielu kategoriach sklepu.</p>
          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-input p-3">
            {kategorieDemo.map((cat) => (
              <label key={cat.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  defaultChecked={cat.nazwa === product.kategoria}
                  className="size-4 rounded border-input accent-primary"
                />
                <span>{cat.nazwa}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-price" className="text-sm font-medium">Cena (PLN)</label>
          <input
            id="product-price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={priceMajor}
            placeholder="0.00"
            className={`h-10 ${inputClass}`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="product-min-qty" className="text-sm font-medium">Minimalna ilość (szt.)</label>
          <input id="product-min-qty" type="number" min={1} max={99} defaultValue={1} className={`h-10 ${inputClass}`} />
          <p className="text-xs text-muted-foreground">
            Klient nie zamówi mniej sztuk na raz (np. 5 dla voucherów).
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="submit" className="h-10 gap-1.5">
            <Save className="size-4" aria-hidden />
            Zapisz produkt
          </Button>
          <Link
            href="/magazyn/produkty"
            className="inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Anuluj
          </Link>
        </div>
      </aside>
    </form>
  );
}
