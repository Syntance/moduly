import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ─── Button (1:1 z @moduly/ui Button) ─────────────────────────── */
type Variant = "default" | "ghost" | "outline" | "destructive";
type Size = "sm" | "default" | "lg" | "icon";

const VARIANT: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  ghost: "hover:bg-muted hover:text-foreground",
  outline: "border border-border bg-card hover:bg-muted",
  destructive: "border border-destructive/30 text-destructive hover:bg-destructive/10",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  default: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
  icon: "size-9",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className, variant = "default", size = "default", type = "button", ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant], SIZE[size], className,
      )}
      {...props}
    />
  );
}

/* ─── Page header (font-serif jak w Lumine OverviewPage) ───────── */
export function PageHeader({ title, description, action }: {
  title: string; description?: string; action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-2xl text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </header>
  );
}

/* ─── Card ─────────────────────────────────────────────────────── */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6", className)}>
      {children}
    </div>
  );
}

/* ─── Tile (kafel modułu jak w OverviewPage Lumine) ───────────── */
export function ModuleTile({ href, label, icon, badge }: {
  href: string; label: string; icon: ReactNode; badge?: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="flex-1 font-serif text-lg text-foreground">{label}</span>
      {badge && (
        <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
          {badge}
        </span>
      )}
    </a>
  );
}

/* ─── Badge / status (1:1 z lumineconcept.pl order-status.ts) ─── */
export const BADGE_TONE = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
	success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  danger: "bg-destructive/10 text-destructive",
  refund: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  brand: "bg-primary/10 text-primary",
} as const;

export type BadgeTone = keyof typeof BADGE_TONE;

export function Badge({ children, tone = "neutral", className }: {
  children: ReactNode; tone?: BadgeTone; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", BADGE_TONE[tone], className)}>
      {children}
    </span>
  );
}

/** StatusBadge — identyczny wzorzec jak OrdersList / ProductsList w Lumine */
export function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return <Badge tone={tone}>{label}</Badge>;
}

/* ─── Tabela (1:1 z OrdersList Lumine) ──────────────────────────── */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">{children}</thead>;
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-border">{children}</tbody>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-sm", className)}>{children}</td>;
}

/* ─── KPI tile ─────────────────────────────────────────────────── */
export function StatTile({ label, value, sub, trend }: {
  label: string;
  value: ReactNode;
  sub?: string;
  trend?: { val: string; up: boolean };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl text-foreground">{value}</p>
      {(sub || trend) && (
        <div className="mt-1 flex items-center gap-2">
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          {trend && (
            <span className={cn("text-xs font-medium", trend.up ? "text-emerald-700" : "text-red-700")}>
              {trend.up ? "↑" : "↓"} {trend.val}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Input (jak @moduly/ui Input) ─────────────────────────────── */
export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition-colors",
        "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/* ─── Switch (jak @moduly/ui Switch) ───────────────────────────── */
export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        checked ? "bg-primary" : "bg-input",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ─── Sekcja z nagłówkiem ──────────────────────────────────────── */
export function Section({ title, action, children }: {
  title: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
