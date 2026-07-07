"use client";

import { useEffect, useState } from "react";

type StoreConfigOption = {
  type: string;
  name: string;
  hex_color: string | null;
};

function buildMapFromResponse(data: unknown): Record<string, string> {
  const raw = data as { config_options?: StoreConfigOption[] };
  const all = raw.config_options ?? [];
  const map: Record<string, string> = {};
  for (const o of all) {
    if (o.type !== "color" || !o.hex_color) continue;
    map[o.name.toLowerCase()] = o.hex_color;
  }
  return map;
}

let cachedMap: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

async function loadColorMap(): Promise<Record<string, string>> {
  if (cachedMap) return cachedMap;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/medusa/store/product-config", {
        credentials: "same-origin",
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return {};
      const data = await res.json();
      const map = buildMapFromResponse(data);
      cachedMap = map;
      return map;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.warn("[useGlobalColorMap] Przekroczono czas — spróbuj ponownie.");
      }
      return {};
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Mapa nazwa koloru (lowercase) → hex z globalnej konfiguracji Medusy.
 * Jedno ładowanie na sesję — spójne z paletą w konfiguratorze.
 */
export function useGlobalColorMap(): Record<string, string> | null {
  const [map, setMap] = useState<Record<string, string> | null>(() =>
    cachedMap ? cachedMap : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (cachedMap) {
      setMap(cachedMap);
      return;
    }
    void loadColorMap().then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
