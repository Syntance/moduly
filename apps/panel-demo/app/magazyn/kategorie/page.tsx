import { Plus, FolderOpen, ChevronRight } from "lucide-react";
import { PageHeader, Badge, Button, Card } from "@/components/ui";
import { kategorieDemo } from "@/lib/data";

const podkategorie: Record<string, string[]> = {
  "KAT-01": ["Bluzy", "Kurtki", "Spodnie", "Koszulki", "Bielizna termoaktywna", "Skarpety"],
  "KAT-02": ["Buty trekkingowe", "Buty biegowe", "Sandały", "Obuwie codzienne"],
  "KAT-03": ["Plecaki", "Czapki", "Rękawice", "Okulary", "Paski", "Portfele", "Narzędzia", "Bidony"],
  "KAT-04": ["Rowery", "Wspinaczka", "Wędkarstwo", "Fitness", "Narciarstwo"],
  "KAT-05": [],
};

export default function Kategorie() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Kategorie"
        description="Zarządzaj strukturą drzewa kategorii i przypisaniami produktów."
        action={<Button><Plus className="size-4" /> Nowa kategoria</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {kategorieDemo.map((kat) => (
          <Card key={kat.id} className="!p-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FolderOpen className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-serif text-lg text-foreground">{kat.nazwa}</p>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">/{kat.slug}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="neutral">{kat.produkty} prod.</Badge>
                <Badge tone={kat.aktywna ? "success" : "neutral"}>{kat.aktywna ? "Aktywna" : "Ukryta"}</Badge>
              </div>
            </div>

            <div className="px-5 py-4">
              {podkategorie[kat.id]?.length > 0 ? (
                <>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Podkategorie ({kat.podkategorie})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {podkategorie[kat.id].map((sub) => (
                      <button
                        key={sub}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                      >
                        {sub} <ChevronRight className="size-3" />
                      </button>
                    ))}
                    <button className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20">
                      <Plus className="size-3" /> Dodaj
                    </button>
                  </div>
                </>
              ) : (
                <button className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  <Plus className="size-3.5" /> Dodaj podkategorię
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
