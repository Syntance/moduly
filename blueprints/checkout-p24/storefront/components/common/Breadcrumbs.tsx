import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { serializeJsonLd } from "@/lib/seo/json-ld";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/** Lewa krawędź jak siatka Bestsellery na stronie głównej. */
export const BREADCRUMBS_ALIGN_CLASS = "container mx-auto px-4";

export function BreadcrumbsShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(BREADCRUMBS_ALIGN_CLASS, className)}>{children}</div>;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${process.env.NEXT_PUBLIC_SITE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className={cn("mb-6", className)}>
        <ol className="flex flex-wrap items-center gap-1.5 text-[13px] uppercase tracking-wider text-brand-500">
          {items.map((item, index) => (
            <li key={`${index}-${item.href ?? item.label}`} className="flex items-center gap-1.5">
              {index > 0 && <span className="text-brand-300">/</span>}
              {item.href && index < items.length - 1 ? (
                <Link
                  href={item.href}
                  className="hover:text-brand-900 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={index === items.length - 1 ? "text-brand-800" : ""}>
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
