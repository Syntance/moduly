import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { zamowieniaDemo, formatKwota, statusZamowienia } from "@/lib/data";

const produktyWZamowieniu = [
  { nazwa: "Kurtka zimowa Premium", wariant: "Czarny / XL", sku: "KZP-BLK-XL", ilosc: 1, cena: 39900 },
  { nazwa: "Czapka wełniana", wariant: "Granatowy / UNI", sku: "CZW-NVY-UNI", ilosc: 2, cena: 4900 },
];

export default async function ZamowienieDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const zamowienie = zamowieniaDemo.find((z) => z.id === id) ?? zamowieniaDemo[0];
  const s = statusZamowienia[zamowienie.status];
  const suma = produktyWZamowieniu.reduce((acc, p) => acc + p.cena * p.ilosc, 0);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/magazyn/zamowienia" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Wróć do listy
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl text-foreground">Zamówienie #{zamowienie.id}</h1>
            <Badge tone={s.tone}>{s.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Złożone {zamowienie.data} · {zamowienie.produkty} pozycje · {zamowienie.klient}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">Drukuj</Button>
          <Button variant="outline">Zmień status</Button>
          <Button>Oznacz jako wysłane</Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <h2 className="font-serif text-lg text-foreground">Pozycje ({zamowienie.produkty})</h2>
            <div className="mt-4 divide-y divide-border">
              {produktyWZamowieniu.map((p) => (
                <div key={p.sku} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 font-serif text-lg text-primary">
                    {p.nazwa.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{p.nazwa}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.wariant} · SKU: {p.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{formatKwota(p.cena * p.ilosc)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.ilosc} × {formatKwota(p.cena)}</p>
                  </div>
                </div>
              ))}
            </div>

            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Suma produktów</dt>
                <dd className="text-foreground">{formatKwota(suma)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dostawa (InPost Paczkomat)</dt>
                <dd className="text-foreground">Darmowa</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rabat (WITAJ10)</dt>
                <dd className="text-foreground">−{formatKwota(Math.round(suma * 0.1))}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 font-medium">
                <dt className="text-foreground">Razem</dt>
                <dd className="font-serif text-lg text-foreground">{formatKwota(zamowienie.kwota)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="font-serif text-lg text-foreground">Historia zamówienia</h2>
            <ol className="relative mt-4 space-y-4 border-l border-border pl-5">
              {[
                { czas: "15 cze, 14:32", text: "Zamówienie złożone przez klienta", sub: "Płatność: Przelewy24 · Zatwierdzona" },
                { czas: "15 cze, 14:33", text: "Płatność potwierdzona", sub: "Transakcja: P24-8472639" },
                { czas: "15 cze, 15:10", text: "Zamówienie przekazane do magazynu", sub: "Paczka: #PKG-001847" },
                { czas: "15 cze, 16:45", text: "Paczka przekazana do kuriera", sub: "InPost · List: 504204917218000000111" },
              ].map((e) => (
                <li key={e.czas} className="relative">
                  <span className="absolute -left-[26px] top-1.5 grid size-3 place-items-center rounded-full bg-primary ring-4 ring-background" />
                  <p className="text-sm font-medium text-foreground">{e.text}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.czas} · {e.sub}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="font-serif text-base text-foreground">Klient</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <dd className="font-medium text-foreground">{zamowienie.klient}</dd>
              <dd className="text-muted-foreground">{zamowienie.email}</dd>
              <dd className="text-muted-foreground">+48 600 123 456</dd>
            </dl>
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Łącznie: 4 zamówienia · {formatKwota(128400)}
            </p>
          </Card>

          <Card>
            <h2 className="font-serif text-base text-foreground">Adres dostawy</h2>
            <address className="mt-3 not-italic text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{zamowienie.klient}</p>
              <p>ul. Marszałkowska 140/7a</p>
              <p>00-061 {zamowienie.miasto}</p>
              <p>Polska</p>
            </address>
          </Card>

          <Card>
            <h2 className="font-serif text-base text-foreground">Płatność i dostawa</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Metoda płatności</dt>
                <dd className="text-foreground">Przelewy24</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Dostawa</dt>
                <dd className="text-foreground">InPost Paczkomat</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status płatności</dt>
                <dd><Badge tone="success">Opłacone</Badge></dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
