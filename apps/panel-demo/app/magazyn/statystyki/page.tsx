"use client";

import { PageHeader } from "@/components/ui";
import { StatisticsTabs } from "@/components/statistics/statistics-tabs";

export default function StatystykiPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Statystyki"
        description="Sprzedaż sklepu oraz ruch i konwersja z Google Analytics 4 i PostHog."
      />
      <StatisticsTabs />
    </div>
  );
}
