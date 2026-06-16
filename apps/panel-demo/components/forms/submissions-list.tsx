import { MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui";
import { formularzeDemo, statusFormularza } from "@/lib/data";

export function SubmissionsList() {
  return (
    <ul className="flex flex-col gap-2">
      {formularzeDemo.map((f) => {
        const s = statusFormularza[f.status];
        return (
          <li key={f.id}>
            <button
              type="button"
              className="flex w-full items-start gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/30 hover:bg-muted/30"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <MessageSquare className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{f.temat}</span>
                  {f.status === "nowe" ? (
                    <span className="inline-block size-2 rounded-full bg-primary" aria-label="Nowe" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{f.nadawca}</span> · {f.formularz}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{f.tresc}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge tone={s.tone}>{s.label}</Badge>
                <span className="text-xs text-muted-foreground">{f.data}</span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
