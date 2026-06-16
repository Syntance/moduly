import Link from "next/link";
import { ArrowUpDown, Copy, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { produktyDemo, statusProduktu, formatKwota } from "@/lib/data";

const actionBtn =
  "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const deleteBtn =
  "inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-destructive/30";

export default function Produkty() {
  const count: number = produktyDemo.length;
  const countLabel = count === 1 ? "pozycja" : "pozycji";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Produkty"
        description="Zarządzaj asortymentem sklepu"
        action={
          <>
            <Button variant="outline">Eksport</Button>
            <Button><Plus className="size-4" /> Dodaj produkt</Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Szukaj: nazwa, SKU…"
            className="flex h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
            <option>Wszystkie kategorie</option>
            <option>Odzież</option>
            <option>Obuwie</option>
            <option>Akcesoria</option>
          </select>
          <select className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground">
            <option>Wszystkie statusy</option>
            <option>Aktywne</option>
            <option>Niski stan</option>
            <option>Brak</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {count} {countLabel} w magazynie
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-left">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              {["Produkt", "SKU", "Kategoria", "Cena", "Stan", "Warianty", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1.5 hover:text-foreground">
                    {h} <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {produktyDemo.map((p) => {
              const s = statusProduktu[p.status];
              return (
                <tr key={p.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/magazyn/produkty/${p.id}`} className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-serif text-sm text-primary">
                        {p.nazwa.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.nazwa}</p>
                        <p className="text-xs text-muted-foreground">/{p.slug}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.kategoria}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{formatKwota(p.cena)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={
                      p.stan === 0 ? "font-semibold text-red-700"
                      : p.stan <= 10 ? "font-semibold text-amber-700"
                      : "font-medium text-foreground"
                    }>
                      {p.stan} szt.
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{p.warianty}</td>
                  <td className="px-4 py-3"><StatusBadge label={s.label} tone={s.tone} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/magazyn/produkty/${p.id}`} aria-label={`Edytuj ${p.nazwa}`} className={actionBtn}>
                        <Pencil className="size-4" aria-hidden />
                      </Link>
                      <button type="button" aria-label={`Kopiuj ${p.nazwa}`} title="Powiel produkt" className={actionBtn}>
                        <Copy className="size-4" aria-hidden />
                      </button>
                      <button type="button" aria-label={`Usuń ${p.nazwa}`} className={deleteBtn}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
