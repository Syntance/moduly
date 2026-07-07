"use client";

import { type ReactNode } from "react";
import { useGlobalColorMap } from "@/hooks/useGlobalColorMap";
import { parseLineItemExtraRows } from "@/lib/cart/line-item-extras";

const COLOR_ELEMENT_LABELS: Record<string, string> = {
  kolor: "Kolor",
  tabliczki: "Tabliczka",
  podstawki: "Podstawka",
  "3d": "Elementy 3D",
  "elementów_3d": "Elementy 3D",
  "elementow_3d": "Elementy 3D",
};

/**
 * Odwraca extractMetaKey: slug "tabliczki_bazowej" → "Kolor tabliczki bazowej".
 * Używane gdy slug nie pasuje do słownika COLOR_ELEMENT_LABELS.
 */
function slugToColorLabel(slug: string): string {
  if (slug === "kolor") return "Kolor";
  return "Kolor " + slug.replace(/_/g, " ");
}

function hasCertificateStand(meta: Record<string, string> | undefined): boolean {
  const v = meta?.certificate_stand;
  return v === "true" || v === "1";
}

export function certificateStandLine(
  meta: Record<string, string> | undefined,
): string | null {
  if (!hasCertificateStand(meta)) return null;
  const color =
    meta?.color_podstawki?.trim() ||
    meta?.color_podstawki_custom?.trim() ||
    null;
  if (color) return `+ Podstawka: ${color}`;
  return "+ Podstawka";
}

function parseHexLike(s: string): string | null {
  const t = s.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(t)) return t;
  if (/^rgba?\(/i.test(t)) return t;
  return null;
}

function ColorSwatch({
  color,
  compact,
}: {
  color: string | null | undefined;
  compact?: boolean;
}) {
  const c = color?.trim();
  const size = compact ? "h-3 w-3" : "h-3.5 w-3.5";
  if (!c) {
    return (
      <span
        className={`inline-block ${size} shrink-0 rounded-full border border-brand-300 bg-brand-100`}
        aria-hidden
      />
    );
  }
  if (c === "transparent") {
    return (
      <span
        className={`inline-block ${size} shrink-0 rounded-full border border-dashed border-brand-300 bg-[repeating-conic-gradient(#efe8e4_0%_25%,#fff_0%_50%)] bg-[length:6px_6px]`}
        aria-hidden
      />
    );
  }
  return (
    <span
      className={`inline-block ${size} shrink-0 rounded-full border border-brand-200 shadow-sm`}
      style={{ backgroundColor: c }}
      aria-hidden
    />
  );
}

export type CartConfiguratorDensity = "default" | "compact";

const ROW_CLASS: Record<CartConfiguratorDensity, string> = {
  default:
    "mt-0.5 flex flex-wrap items-center gap-2 text-sm font-medium leading-snug text-brand-700",
  compact:
    "mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-medium leading-snug text-brand-600",
};

const STAND_CLASS: Record<CartConfiguratorDensity, string> = {
  default: "mt-0.5 text-sm leading-snug text-brand-600",
  compact: "mt-0.5 text-[11px] leading-snug text-brand-500",
};

const EXTRA_TEXT_CLASS: Record<CartConfiguratorDensity, string> = {
  default: "text-sm leading-snug text-brand-600",
  compact: "text-[11px] leading-snug text-brand-500",
};

const EXTRA_LINK_CLASS: Record<CartConfiguratorDensity, string> = {
  default: "text-sm leading-snug text-brand-600 underline-offset-2 hover:underline",
  compact: "text-[11px] leading-snug text-brand-500 underline-offset-2 hover:underline",
};

function LineItemExtraRows({
  meta,
  density,
}: {
  meta: Record<string, string>;
  density: CartConfiguratorDensity;
}) {
  const rows = parseLineItemExtraRows(meta);
  if (rows.length === 0) return null;

  const textCls = EXTRA_TEXT_CLASS[density];
  const linkCls = EXTRA_LINK_CLASS[density];

  return (
    <div className="mt-0.5 space-y-0.5">
      {rows.map((row) => {
        if (row.kind === "text") {
          return (
            <p key={`text-${row.label}-${row.value}`} className={textCls}>
              <span className="font-medium text-brand-700">{row.label}:</span>{" "}
              <span className="break-words">&ldquo;{row.value}&rdquo;</span>
            </p>
          );
        }
        if (row.kind === "file") {
          return (
            <p key={`file-${row.url}`} className={textCls}>
              <span className="font-medium text-brand-700">{row.label}:</span>{" "}
              <a
                href={row.url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkCls}
              >
                {row.filename}
              </a>
            </p>
          );
        }
        return (
          <p key={`link-${row.url}`} className={textCls}>
            <span className="font-medium text-brand-700">{row.label}:</span>{" "}
            <a href={row.url} target="_blank" rel="noopener noreferrer" className={linkCls}>
              {row.url}
            </a>
          </p>
        );
      })}
    </div>
  );
}

function CartSelectedColorRows({
  meta,
  paletteMap,
  density,
}: {
  meta: Record<string, string>;
  paletteMap: Record<string, string> | null;
  density: CartConfiguratorDensity;
}) {
  const rows: ReactNode[] = [];
  const rowCls = ROW_CLASS[density];
  const compact = density === "compact";

  if (meta.custom_color?.trim()) {
    const raw = meta.custom_color.trim();
    const swatch = parseHexLike(raw) ?? raw;
    rows.push(
      <p key="legacy-custom_color" className={rowCls}>
        <span>Kolor:</span>
        <ColorSwatch color={swatch} compact={compact} />
        <span>{raw}</span>
      </p>,
    );
  }

  const paletteKeys = Object.keys(meta).filter(
    (k) =>
      k.startsWith("color_") &&
      !k.endsWith("_custom") &&
      !k.endsWith("_mat") &&
      !k.endsWith("_hex") &&
      !k.endsWith("_label") &&
      meta[k]?.trim(),
  );

  const customBases = new Set(
    Object.keys(meta)
      .filter((k) => k.startsWith("color_") && k.endsWith("_custom"))
      .map((k) => k.replace(/_custom$/, "")),
  );

  for (const k of [...paletteKeys].sort()) {
    if (customBases.has(k)) continue;
    const slug = k.slice("color_".length);
    const label = meta[`${k}_label`] ?? COLOR_ELEMENT_LABELS[slug] ?? slugToColorLabel(slug);
    const value = (meta[k] ?? "").trim();
    const paletteHex = meta[`${k}_hex`]?.trim();
    const fromMap = paletteMap?.[value.toLowerCase()]?.trim();
    const swatch =
      paletteHex && paletteHex.length > 0
        ? paletteHex
        : parseHexLike(value) ??
          (fromMap && fromMap.length > 0 ? fromMap : undefined);
    let suffix = "";
    if (meta[`${k}_mat`] === "true") suffix = " (mat)";
    rows.push(
      <p key={k} className={rowCls}>
        <span>{label}:</span>
        <ColorSwatch color={swatch} compact={compact} />
        <span>
          {value}
          {suffix}
        </span>
      </p>,
    );
  }

  for (const [k, v] of Object.entries(meta)) {
    if (!k.startsWith("color_") || !k.endsWith("_custom") || !v?.trim()) continue;
    const base = k.replace(/_custom$/, "");
    const slug = base.slice("color_".length);
    const label = meta[`${base}_label`] ?? COLOR_ELEMENT_LABELS[slug] ?? slugToColorLabel(slug);
    const swatch = parseHexLike(v) ?? v.trim();
    let suffix = "";
    if (meta[`${base}_mat`] === "true") suffix = " (mat)";
    rows.push(
      <p key={k} className={rowCls}>
        <span>{label}:</span>
        <ColorSwatch color={swatch} compact={compact} />
        <span>
          {v.trim()}
          {suffix}
        </span>
      </p>,
    );
  }

  if (rows.length === 0) return null;
  return <div className="min-w-0">{rows}</div>;
}

/**
 * Kolory z konfiguratora, pola tekstowe, pliki, linki QR i podstawka certyfikatu.
 */
export function CartConfiguratorDetails({
  metadata,
  density = "default",
  showExtras = true,
}: {
  metadata?: Record<string, string>;
  density?: CartConfiguratorDensity;
  /** Pola tekstowe, pliki i linki — w magazynie renderowane osobno. */
  showExtras?: boolean;
}) {
  const paletteMap = useGlobalColorMap();
  if (!metadata) return null;

  const stand = certificateStandLine(metadata);
  const extras = showExtras ? parseLineItemExtraRows(metadata) : [];
  const hasColors =
    metadata.custom_color?.trim() ||
    Object.keys(metadata).some((k) => k.startsWith("color_") && metadata[k]?.trim());

  if (!hasColors && !stand && extras.length === 0) return null;

  return (
    <>
      <CartSelectedColorRows
        meta={metadata}
        paletteMap={paletteMap}
        density={density}
      />
      {stand && <p className={STAND_CLASS[density]}>{stand}</p>}
      {showExtras ? <LineItemExtraRows meta={metadata} density={density} /> : null}
    </>
  );
}
