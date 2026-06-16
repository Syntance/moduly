import { PageHeader } from "@/components/ui";

export default function MotywyPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Motywy magazynu"
        description="Wygląd panelu administracyjnego — demo bez backendu."
      />
      <p className="text-sm text-muted-foreground">
        W produkcji: wybór motywu panelu (jasny / ciemny / markowy).
      </p>
    </div>
  );
}
