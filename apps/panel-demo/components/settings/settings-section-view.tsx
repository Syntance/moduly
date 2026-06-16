import type { LucideIcon } from "lucide-react";
import { Button, Card } from "@/components/ui";
import type { SettingsSectionData } from "@/lib/settings-data";

type Props = {
  icon: LucideIcon;
  data: SettingsSectionData;
};

export function SettingsSectionView({ icon: Icon, data }: Props) {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        <div className="flex-1">
          <h2 className="font-serif text-lg text-foreground">{data.tytul}</h2>
          <p className="text-xs text-muted-foreground">{data.opis}</p>
        </div>
        <Button variant="outline" size="sm">
          Edytuj
        </Button>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        {data.pola.map((p) => (
          <div key={p.label} className="rounded-lg border border-border bg-muted/30 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.label}</dt>
            <dd className="mt-1 text-sm text-foreground">{p.val}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
