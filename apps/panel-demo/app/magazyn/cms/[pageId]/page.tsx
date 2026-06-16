import { notFound } from "next/navigation";
import { CmsShell } from "@/components/cms/cms-shell";
import { PageContentEditor } from "@/components/cms/page-content-editor";
import { cmsPages } from "@/lib/cms-data";

type Props = {
  params: Promise<{ pageId: string }>;
};

export function generateStaticParams() {
  return cmsPages.map((page) => ({ pageId: page.id }));
}

export default async function CmsSubPage({ params }: Props) {
  const { pageId } = await params;
  const page = cmsPages.find((p) => p.id === pageId);

  if (!page) {
    notFound();
  }

  return (
    <CmsShell>
      <PageContentEditor pageLabel={page.label} />
    </CmsShell>
  );
}
