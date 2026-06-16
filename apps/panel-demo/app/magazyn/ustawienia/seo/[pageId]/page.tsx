import { notFound } from "next/navigation";
import { SeoSettingsClient } from "@/components/seo/seo-settings-client";
import { getSeoPageById, seoPages } from "@/lib/seo-data";

type Props = {
  params: Promise<{ pageId: string }>;
};

export function generateStaticParams() {
  return seoPages.map((p) => ({ pageId: p.id }));
}

export default async function SeoPageSettingsPage({ params }: Props) {
  const { pageId } = await params;
  const page = getSeoPageById(pageId);

  if (!page) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-2xl text-foreground">SEO — {page.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{page.path}</p>
      </header>

      <SeoSettingsClient activeTab={pageId} />
    </div>
  );
}
