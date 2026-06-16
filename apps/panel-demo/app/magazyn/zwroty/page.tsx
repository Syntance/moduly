import { PageHeader, Badge, Button, StatTile } from "@/components/ui";
import { zwrotyDemo, formatKwota, statusZwrotu } from "@/lib/data";

export default function Zwroty() {
  const oczekuje = zwrotyDemo.filter((z) => z.status === "oczekuje").length;
  const wTrakcie = zwrotyDemo.filter((z) => z.status === "w_trakcie").length;
  const reklamacje = zwrotyDemo.filter((z) => z.typ === "reklamacja").length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Zwroty i reklamacje"
        description={`${oczekuje} oczekuje na decyzję · ${wTrakcie} w trakcie rozpatrywania`}
        action={<Button variant="outline">Eksport CSV</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Oczekuje" value={oczekuje} />
        <StatTile label="W trakcie" value={wTrakcie} />
        <StatTile label="Reklamacje" value={reklamacje} />
        <StatTile label="Łącznie (30 dni)" value={47} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-left">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              {["ID", "Zamówienie", "Klient", "Produkt", "Powód", "Kwota", "Typ", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {zwrotyDemo.map((z) => {
              const s = statusZwrotu[z.status];
              return (
                <tr key={z.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm font-semibold text-foreground">{z.id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{z.zamowienie}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{z.klient}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{z.produkt}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{z.powod}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{formatKwota(z.kwota)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={z.typ === "reklamacja" ? "danger" : "neutral"}>
                      {z.typ === "reklamacja" ? "Reklamacja" : "Zwrot"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
