export type AnalyticsKpi = {
  sessions: number | null;
  users: number | null;
  pageviews: number | null;
  purchases: number | null;
  revenueMinor: number | null;
  conversionRate: number | null;
};

export type DailyPoint = { date: string; label: string; value: number };

export type Ga4Slice = {
  status: "connected";
  label: string;
  kpi: AnalyticsKpi;
  traffic: DailyPoint[];
  channels: Array<{ channel: string; sessions: number; share: number }>;
  topPages: Array<{ path: string; views: number; share: number }>;
};

export type PosthogSlice = {
  status: "connected";
  label: string;
  kpi: AnalyticsKpi;
  traffic: DailyPoint[];
  funnel: Array<{ event: string; label: string; count: number; rateFromTop: number }>;
  topEvents: Array<{ event: string; count: number }>;
};

export type AnalyticsDashboardData = {
  fetchedAt: string;
  rangeDays: number;
  ga4: Ga4Slice;
  posthog: PosthogSlice;
};

function buildTrafficSeries(base: number, growth = 1.02): DailyPoint[] {
  const points: DailyPoint[] = [];
  const now = new Date(2026, 5, 15);
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    points.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" }),
      value: Math.round(base * growth ** (29 - i) + (i % 5) * 12),
    });
  }
  return points;
}

export const demoAnalyticsDashboard: AnalyticsDashboardData = {
  fetchedAt: "2026-06-15T10:30:00.000Z",
  rangeDays: 30,
  ga4: {
    status: "connected",
    label: "GA4 · Outdoor Store (demo)",
    kpi: {
      sessions: 24_812,
      users: 18_394,
      pageviews: 67_420,
      purchases: 847,
      revenueMinor: 148_320_00,
      conversionRate: 3.41,
    },
    traffic: buildTrafficSeries(620),
    channels: [
      { channel: "Organic Search", sessions: 9_842, share: 39.7 },
      { channel: "Paid Search", sessions: 5_118, share: 20.6 },
      { channel: "Direct", sessions: 4_231, share: 17.1 },
      { channel: "Social", sessions: 2_904, share: 11.7 },
      { channel: "Email", sessions: 1_652, share: 6.7 },
      { channel: "Referral", sessions: 1_065, share: 4.3 },
    ],
    topPages: [
      { path: "/", views: 18_420, share: 27.3 },
      { path: "/sklep", views: 12_804, share: 19.0 },
      { path: "/sklep/kurtka-zimowa-premium", views: 6_218, share: 9.2 },
      { path: "/sklep/buty-trekkingowe-alpin", views: 4_891, share: 7.3 },
      { path: "/kontakt", views: 3_102, share: 4.6 },
      { path: "/koszyk", views: 2_876, share: 4.3 },
      { path: "/checkout", views: 2_104, share: 3.1 },
    ],
  },
  posthog: {
    status: "connected",
    label: "PostHog · projekt outdoor-store (demo)",
    kpi: {
      sessions: 23_104,
      users: 17_820,
      pageviews: 64_980,
      purchases: 831,
      revenueMinor: 145_890_00,
      conversionRate: 3.6,
    },
    traffic: buildTrafficSeries(580, 1.018),
    funnel: [
      { event: "view_item", label: "Wyświetlenie produktu", count: 28_420, rateFromTop: 100 },
      { event: "add_to_cart", label: "Dodanie do koszyka", count: 6_842, rateFromTop: 24.1 },
      { event: "begin_checkout", label: "Rozpoczęcie checkoutu", count: 2_918, rateFromTop: 10.3 },
      { event: "purchase", label: "Zakup", count: 831, rateFromTop: 2.9 },
    ],
    topEvents: [
      { event: "$pageview", count: 64_980 },
      { event: "view_item", count: 28_420 },
      { event: "add_to_cart", count: 6_842 },
      { event: "begin_checkout", count: 2_918 },
      { event: "purchase", count: 831 },
      { event: "search", count: 4_102 },
      { event: "newsletter_signup", count: 612 },
      { event: "form_submit", count: 128 },
    ],
  },
};
