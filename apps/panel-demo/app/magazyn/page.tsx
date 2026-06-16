"use client";
import {
  ShoppingBag, Package, Tags, FileText, Mail, MessageSquare,
  RotateCcw, BarChart3, Settings,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ModuleTile, StatTile, Card, Section, Badge } from "@/components/ui";
import { stats, przychodyMiesieczne, zamowieniaDemo, formatKwota, statusZamowienia } from "@/lib/data";
import Link from "next/link";

const TILES = [
  { href: "/magazyn/zamowienia", label: "Zamówienia", icon: <ShoppingBag className="size-5" />, badge: "12" },
  { href: "/magazyn/zwroty", label: "Zwroty i reklamacje", icon: <RotateCcw className="size-5" />, badge: "2" },
  { href: "/magazyn/produkty", label: "Produkty", icon: <Package className="size-5" /> },
  { href: "/magazyn/kategorie", label: "Kategorie", icon: <Tags className="size-5" /> },
  { href: "/magazyn/cms", label: "CMS", icon: <FileText className="size-5" /> },
  { href: "/magazyn/maile", label: "E-maile", icon: <Mail className="size-5" /> },
  { href: "/magazyn/formularze", label: "Formularze", icon: <MessageSquare className="size-5" />, badge: "3" },
  { href: "/magazyn/statystyki", label: "Statystyki", icon: <BarChart3 className="size-5" /> },
  { href: "/magazyn/ustawienia", label: "Ustawienia sklepu", icon: <Settings className="size-5" /> },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-serif text-2xl text-foreground">Przegląd</h1>
        <p className="mt-1 text-sm text-muted-foreground">Wybierz moduł, którym chcesz zarządzać.</p>
      </header>

      {/* KPI summary — Lumine OverviewPage „summary" */}
      <Section title="Podsumowanie (czerwiec 2026)">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Przychód" value={formatKwota(stats.przychod)} trend={{ val: "18.4%", up: true }} sub="vs. maj" />
          <StatTile label="Zamówienia" value={stats.zamowienia.toLocaleString("pl-PL")} trend={{ val: "9.2%", up: true }} sub="1 691 w maju" />
          <StatTile label="Klienci" value={stats.klienci.toLocaleString("pl-PL")} trend={{ val: "5.1%", up: true }} sub="+158 nowych" />
          <StatTile label="Śr. wartość koszyka" value={formatKwota(stats.srednia)} trend={{ val: "3.1%", up: true }} />
        </div>
      </Section>

      {/* Moduły — Lumine OverviewPage „tiles" */}
      <Section title="Moduły panelu">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.map((t) => (
            <ModuleTile key={t.href} href={t.href} label={t.label} icon={t.icon} badge={t.badge} />
          ))}
        </div>
      </Section>

      {/* Wykres + ostatnie zamówienia */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-foreground">Przychód miesięczny</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Styczeń – Czerwiec 2026</p>
            </div>
            <Badge tone="brand">+18.4% vs 2025</Badge>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={przychodyMiesieczne} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#AF7C61" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#AF7C61" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="miesiac" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, color: "var(--foreground)" }}
                formatter={(v: number) => [formatKwota(v * 100), "Przychód"]}
              />
              <Area type="monotone" dataKey="przychod" stroke="#AF7C61" strokeWidth={2} fill="url(#grad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="font-serif text-lg text-foreground">Zamówienia wg statusu</h2>
          <div className="mt-4 space-y-3">
            {[
              { label: "Zrealizowane", val: 1591, color: "bg-emerald-500", pct: 86 },
              { label: "W realizacji", val: 189, color: "bg-sky-500", pct: 10 },
              { label: "Oczekuje", val: 42, color: "bg-amber-500", pct: 2.3 },
              { label: "Anulowane", val: 25, color: "bg-red-500", pct: 1.4 },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-foreground">{item.label}</span>
                  <span className="font-medium text-foreground">{item.val.toLocaleString("pl-PL")}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Ostatnie zamówienia */}
      <Section
        title="Ostatnie zamówienia"
        action={
          <Link href="/magazyn/zamowienia" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Zobacz wszystkie →
          </Link>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-left">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                {["Zamówienie", "Klient", "Miasto", "Wartość", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {zamowieniaDemo.slice(0, 6).map((z) => {
                const s = statusZamowienia[z.status];
                return (
                  <tr key={z.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link href={`/magazyn/zamowienia/${z.id}`} className="block text-sm font-semibold text-foreground hover:text-primary">
                        #{z.id}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{z.data}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-sm font-medium text-foreground">{z.klient}</span>
                      <span className="block text-xs text-muted-foreground">{z.email}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{z.miasto}</td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{formatKwota(z.kwota)}</td>
                    <td className="px-4 py-3"><Badge tone={s.tone}>{s.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
