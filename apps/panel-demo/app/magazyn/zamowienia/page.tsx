import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { zamowieniaDemo, statusZamowienia, platnoscBadge, wysylkaBadge, formatKwota } from "@/lib/data";

const COLUMNS = ["Zamówienie", "Klient", "Pozycje", "Wartość", "Płatność", "Wysyłka", "Status"];

export default function Zamowienia() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Zamówienia"
        action={<Button variant="outline">Eksport CSV</Button>}
      />

      {/* Filtry */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            placeholder="Szukaj: nr, klient, e-mail…"
            className="flex h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <option>Wszystkie statusy</option>
            <option>W toku</option>
            <option>Zrealizowane</option>
          </select>
          <select className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <option>Wszystkie płatności</option>
            <option>Opłacone</option>
            <option>Nieopłacone</option>
          </select>
          <select className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <option>Wszystkie wysyłki</option>
            <option>U kuriera</option>
            <option>Dostarczone</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-left">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              {COLUMNS.map((col) => (
                <th key={col} className="px-4 py-3 font-medium">
                  <button type="button" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    {col}
                    <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {zamowieniaDemo.map((z) => {
              const s = statusZamowienia[z.status];
              const p = platnoscBadge[z.platnosc] ?? { label: z.platnosc, tone: "neutral" as const };
              const w = wysylkaBadge[z.wysylka] ?? { label: z.wysylka, tone: "neutral" as const };
              return (
                <tr key={z.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/magazyn/zamowienia/${z.id}`} className="block text-sm font-semibold text-foreground hover:text-primary">
                      #{z.id}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{z.data}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-sm font-medium text-foreground">{z.klient}</span>
                    <span className="block text-xs text-muted-foreground">{z.email}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{z.produkty} szt.</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{formatKwota(z.kwota)}</td>
                  <td className="px-4 py-3"><StatusBadge label={p.label} tone={p.tone} /></td>
                  <td className="px-4 py-3"><StatusBadge label={w.label} tone={w.tone} /></td>
                  <td className="px-4 py-3"><StatusBadge label={s.label} tone={s.tone} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
