import { SeoSettingsClient } from "@/components/seo/seo-settings-client";

export default function SeoSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-2xl text-foreground">SEO</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Meta tagi globalne i dla poszczególnych podstron sklepu.
        </p>
      </header>

      <SeoSettingsClient activeTab="global" />
    </div>
  );
}
