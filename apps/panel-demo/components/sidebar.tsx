"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, ShoppingBag, Package, Tags, FileText, Mail, Settings,
  MessageSquare, RotateCcw, BarChart3, ExternalLink, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isSettingsPath, SettingsSidebarNav } from "@/components/settings/settings-sidebar-nav";

const NAV = [
  { href: "/magazyn", label: "Przegląd", icon: LayoutGrid, exact: true },
  { href: "/magazyn/statystyki", label: "Statystyki", icon: BarChart3 },
  { href: "/magazyn/zamowienia", label: "Zamówienia", icon: ShoppingBag },
  { href: "/magazyn/produkty", label: "Produkty", icon: Package },
  { href: "/magazyn/kategorie", label: "Kategorie", icon: Tags },
  { href: "/magazyn/cms", label: "CMS", icon: FileText },
  { href: "/magazyn/maile", label: "E-maile", icon: Mail },
  { href: "/magazyn/formularze", label: "Formularze", icon: MessageSquare },
  { href: "/magazyn/zwroty", label: "Zwroty i reklamacje", icon: RotateCcw },
  { href: "/magazyn/ustawienia", label: "Ustawienia sklepu", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const inSettings = isSettingsPath(pathname);

  return (
    <aside className="flex shrink-0 flex-col gap-6 border-b border-border p-5 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-r lg:border-b-0">
      <Link href="/magazyn" className="block shrink-0">
        <p className="text-[0.65rem] font-medium tracking-[0.25em] text-muted-foreground uppercase">
          Outdoor Store
        </p>
        <p className="font-serif text-lg text-foreground">Panel sklepu</p>
      </Link>

      <div className="flex min-h-0 flex-1 flex-col">
        {inSettings ? (
          <SettingsSidebarNav />
        ) : (
          <nav aria-label="Nawigacja panelu" className="flex flex-col gap-1">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="mt-auto flex shrink-0 flex-col gap-2 border-t border-border pt-4">
        <Link
          href="/"
          className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ExternalLink className="size-4" aria-hidden />
          Otwórz sklep
        </Link>
        <button
          type="button"
          className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogOut className="size-4" aria-hidden />
          Wyloguj
        </button>
      </div>
    </aside>
  );
}
