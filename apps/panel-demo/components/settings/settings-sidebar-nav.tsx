"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  CreditCard,
  Key,
  Paintbrush,
  Search,
  Settings,
  Shield,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const SETTINGS_BASE = "/magazyn/ustawienia";

export const SETTINGS_NAV = [
  { href: `${SETTINGS_BASE}/ogolne`, label: "Ogólne", icon: Settings },
  { href: `${SETTINGS_BASE}/platnosci`, label: "Płatności", icon: CreditCard },
  { href: `${SETTINGS_BASE}/dostawa`, label: "Dostawa", icon: Truck },
  { href: `${SETTINGS_BASE}/powiadomienia`, label: "Powiadomienia", icon: Bell },
  { href: `${SETTINGS_BASE}/bezpieczenstwo`, label: "Bezpieczeństwo", icon: Shield },
  { href: `${SETTINGS_BASE}/api`, label: "API & Webhooks", icon: Key },
  { href: `${SETTINGS_BASE}/motywy`, label: "Motywy magazynu", icon: Paintbrush },
  { href: `${SETTINGS_BASE}/seo`, label: "SEO", icon: Search },
] as const;

export function SettingsSidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/magazyn"
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        Powrót
      </Link>

      <div className="flex flex-col gap-1">
        <p className="px-3 text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Ustawienia
        </p>
        <nav aria-label="Ustawienia sklepu" className="flex flex-col gap-1">
          {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
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
                <Icon className="size-4 shrink-0" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export function isSettingsPath(pathname: string): boolean {
  return pathname.startsWith(SETTINGS_BASE);
}
