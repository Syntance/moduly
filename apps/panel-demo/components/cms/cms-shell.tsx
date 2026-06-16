"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { cmsPages } from "@/lib/cms-data";
import { CmsRedeployButton } from "./cms-redeploy-button";

const BASE = "/magazyn/cms";

type Props = {
  children: ReactNode;
};

export function CmsShell({ children }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-serif text-2xl text-foreground">CMS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Treści i zdjęcia sekcji witryny — per podstrona i globalnie.
        </p>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <nav aria-label="Zakładki CMS" className="flex shrink-0 flex-row flex-wrap gap-1 lg:w-52 lg:flex-col">
          <CmsTab href={BASE} label="Globalne" active={pathname === BASE} />
          {cmsPages.map((page) => (
            <CmsTab
              key={page.id}
              href={`${BASE}/${page.id}`}
              label={page.label}
              active={pathname === `${BASE}/${page.id}`}
            />
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <CmsRedeployButton />
          {children}
        </div>
      </div>
    </div>
  );
}

function CmsTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
