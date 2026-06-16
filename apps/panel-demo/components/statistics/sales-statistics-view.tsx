"use client";

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Card } from "@/components/ui";
import { przychodyMiesieczne, formatKwota } from "@/lib/data";

const dostawy = [
  { name: "InPost Paczkomat", value: 58, color: "#AF7C61" },
  { name: "Kurier DPD", value: 28, color: "#725750" },
  { name: "Odbiór osobisty", value: 9, color: "#C9A48D" },
  { name: "Poczta Polska", value: 5, color: "#8f7a74" },
];

const platnosci = [
  { name: "Przelewy24", value: 51 },
  { name: "BLIK", value: 30 },
  { name: "Karta", value: 13 },
  { name: "PayPo", value: 6 },
];

const topProdukty = [
  { nazwa: "Koszulka techniczna", sprzedane: 876, przychod: 779_424 },
  { nazwa: "Czapka wełniana", sprzedane: 567, przychod: 277_830 },
  { nazwa: "Plecak miejski 30L", sprzedane: 421, przychod: 964_090 },
  { nazwa: "Buty trekkingowe Alpin", sprzedane: 312, przychod: 1_712_880 },
  { nazwa: "Kurtka zimowa Premium", sprzedane: 298, przychod: 1_190_220 },
];

const chartTooltip = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 13,
  color: "var(--foreground)",
};

export function SalesStatisticsView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-serif text-lg text-foreground">Przychód miesięczny</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Styczeń – Czerwiec 2026</p>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={przychodyMiesieczne} margin={{ left: -20 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#AF7C61" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#AF7C61" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="miesiac" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => [formatKwota(v * 100)]} />
                <Area type="monotone" dataKey="przychod" stroke="#AF7C61" strokeWidth={2} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="font-serif text-lg text-foreground">Liczba zamówień</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Styczeń – Czerwiec 2026</p>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={przychodyMiesieczne} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="miesiac" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar dataKey="zamowienia" fill="#AF7C61" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h2 className="font-serif text-lg text-foreground">Metody dostawy</h2>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={dostawy} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2}>
                  {dostawy.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5">
            {dostawy.map((d) => (
              <li key={d.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="size-2 rounded-full inline-block" style={{ background: d.color }} />
                  {d.name}
                </span>
                <span className="font-medium text-foreground">{d.value}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="font-serif text-lg text-foreground">Metody płatności</h2>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={platnosci} layout="vertical" margin={{ left: 0, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={chartTooltip} formatter={(v: number) => [`${v}%`]} />
                <Bar dataKey="value" fill="#AF7C61" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="font-serif text-lg text-foreground">Klienci</h2>
          <div className="mt-4 space-y-4">
            {[
              { label: "Nowi", val: 158, pct: 4.8, color: "bg-sky-500" },
              { label: "Powracający", val: 3133, pct: 95.2, color: "bg-emerald-500" },
            ].map((k) => (
              <div key={k.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-foreground">{k.label}</span>
                  <span className="font-medium text-foreground">{k.val.toLocaleString("pl-PL")} ({k.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${k.color}`} style={{ width: `${k.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Śr. LTV</dt>
              <dd className="font-medium text-foreground">{formatKwota(39_08_00)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Śr. liczba zamówień</dt>
              <dd className="font-medium text-foreground">2.4</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card>
        <h2 className="font-serif text-lg text-foreground">Top 5 produktów</h2>
        <ol className="mt-4 space-y-3">
          {topProdukty.map((p, i) => (
            <li key={p.nazwa} className="flex items-center gap-4">
              <span className="w-5 shrink-0 text-center font-serif text-base text-muted-foreground">{i + 1}</span>
              <div className="flex-1">
                <div className="mb-1 flex justify-between">
                  <span className="text-sm font-medium text-foreground">{p.nazwa}</span>
                  <span className="text-sm font-medium text-foreground">{formatKwota(p.przychod)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(p.sprzedane / 876) * 100}%` }} />
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{p.sprzedane} szt.</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
