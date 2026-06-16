"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    label: "Przegląd",
    items: [
      { href: "/magazyn", label: "Dashboard", icon: IconGrid },
    ],
  },
  {
    label: "Sprzedaż",
    items: [
      { href: "/magazyn/zamowienia", label: "Zamówienia", icon: IconBox, badge: "12" },
      { href: "/magazyn/zwroty", label: "Zwroty i reklamacje", icon: IconReturn, badge: "3" },
    ],
  },
  {
    label: "Katalog",
    items: [
      { href: "/magazyn/produkty", label: "Produkty", icon: IconTag },
      { href: "/magazyn/kategorie", label: "Kategorie", icon: IconFolder },
    ],
  },
  {
    label: "Treści",
    items: [
      { href: "/magazyn/cms", label: "Strony CMS", icon: IconFile },
      { href: "/magazyn/formularze", label: "Formularze", icon: IconForm, badge: "7" },
      { href: "/magazyn/maile", label: "Szablony maili", icon: IconMail },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/magazyn/ustawienia", label: "Ustawienia", icon: IconSettings },
    ],
  },
];

export default function Sidebar() {
  const path = usePathname();

  const isActive = (href: string) =>
    href === "/magazyn" ? path === "/magazyn" : path.startsWith(href);

  return (
    <aside
      style={{
        width: "var(--sidebar-w)",
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "var(--accent)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="5" height="5" rx="1" fill="white" />
              <rect x="9" y="2" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="2" y="9" width="5" height="5" rx="1" fill="white" fillOpacity="0.6" />
              <rect x="9" y="9" width="5" height="5" rx="1" fill="white" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", lineHeight: 1.2 }}>
              Moduly
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.2 }}>
              Panel Admina
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {nav.map((section) => (
          <div key={section.label} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-subtle)",
                padding: "4px 8px 8px",
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "7px 10px",
                    borderRadius: 7,
                    marginBottom: 2,
                    textDecoration: "none",
                    background: active ? "var(--accent-subtle)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    fontWeight: active ? 600 : 400,
                    fontSize: 13,
                    transition: "all 0.12s",
                  }}
                >
                  <item.icon size={15} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span
                      style={{
                        background: "var(--accent)",
                        color: "white",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 999,
                        minWidth: 18,
                        textAlign: "center",
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "linear-gradient(135deg, oklch(0.65 0.2 250), oklch(0.7 0.18 295))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
          }}
        >
          KP
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Kamil Podobinski
          </div>
          <div style={{ fontSize: 11, color: "var(--text-subtle)" }}>Administrator</div>
        </div>
      </div>
    </aside>
  );
}

function IconGrid({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}
function IconBox({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" />
      <path d="M8 2V14M2 5L14 5" />
    </svg>
  );
}
function IconReturn({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 8C2 4.686 4.686 2 8 2C11.314 2 14 4.686 14 8" />
      <path d="M2 8L4 6M2 8L4 10" />
    </svg>
  );
}
function IconTag({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8.5 2H13.5V7L7.5 13C7.1 13.4 6.4 13.4 6 13L3 10C2.6 9.6 2.6 8.9 3 8.5L8.5 2Z" />
      <circle cx="11" cy="5" r="0.8" fill="currentColor" />
    </svg>
  );
}
function IconFolder({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4C2 3.448 2.448 3 3 3H6.5L8 5H13C13.552 5 14 5.448 14 6V12C14 12.552 13.552 13 13 13H3C2.448 13 2 12.552 2 12V4Z" />
    </svg>
  );
}
function IconFile({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4 2H9L13 6V14H4V2Z" />
      <path d="M9 2V6H13" />
      <path d="M6 9H10M6 11.5H10" />
    </svg>
  );
}
function IconForm({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M5 6H11M5 9H9M5 12H7" />
    </svg>
  );
}
function IconMail({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="4" width="12" height="9" rx="1.5" />
      <path d="M2 4.5L8 9L14 4.5" />
    </svg>
  );
}
function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.7 3.3L11.6 4.4M4.4 11.6L3.3 12.7M12.7 12.7L11.6 11.6M4.4 4.4L3.3 3.3" />
    </svg>
  );
}
