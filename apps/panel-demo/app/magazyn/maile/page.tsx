import Link from "next/link";
import { Mail, Eye, Edit3, Copy } from "lucide-react";
import { PageHeader, Badge, Button, Card, StatTile } from "@/components/ui";
import { maileDemo } from "@/lib/data";

export default function Maile() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="E-maile"
        description="Szablony wiadomości transakcyjnych wysyłanych do klientów."
        action={<Button><Mail className="size-4" /> Nowy szablon</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Wysłane (czerwiec)" value="4 120" trend={{ val: "8.2%", up: true }} sub="vs. maj" />
        <StatTile label="Śr. open rate" value="71.3%" sub="Branża: ~42%" />
        <StatTile label="Wersje robocze" value="1" sub="Gotowe do publikacji" />
      </div>

      <ul className="flex flex-col gap-3">
        {maileDemo.map((m) => (
          <li key={m.id}>
            <Card className="!p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex flex-1 items-center gap-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{m.nazwa}</p>
                      <Badge tone={m.status === "aktywny" ? "success" : "warning"}>
                        {m.status === "aktywny" ? "Aktywny" : "Wersja robocza"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-muted-foreground">{m.klucz}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-3 gap-6 text-center text-xs lg:gap-8">
                  <div>
                    <dt className="text-muted-foreground">Wysłane</dt>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">
                      {m.wyslane > 0 ? m.wyslane.toLocaleString("pl-PL") : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Open rate</dt>
                    <dd className="mt-0.5 text-sm font-medium text-foreground">{m.otwarcia}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Edytowano</dt>
                    <dd className="mt-0.5 text-sm text-muted-foreground">{m.ostatniaEdycja}</dd>
                  </div>
                </dl>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Eye className="size-3.5" /> Podgląd</Button>
                  <Link
                    href={`/magazyn/maile/${m.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    <Edit3 className="size-3.5" aria-hidden />
                    Edytuj
                  </Link>
                  <Button variant="ghost" size="sm"><Copy className="size-3.5" /></Button>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
