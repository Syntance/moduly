import Link from "next/link";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string; primary?: boolean };
}

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--text)" }}>{title}</h1>
        {subtitle && <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 13 }}>{subtitle}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          style={{
            background: action.primary !== false ? "var(--accent)" : "var(--bg-card)",
            color: action.primary !== false ? "white" : "var(--text-muted)",
            border: `1px solid ${action.primary !== false ? "transparent" : "var(--border)"}`,
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
