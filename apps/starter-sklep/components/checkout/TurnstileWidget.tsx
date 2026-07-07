"use client";

import { useEffect, useRef } from "react";
import {
  isTurnstileEnabled,
  loadTurnstile,
  TURNSTILE_SITE_KEY,
} from "@/lib/checkout/turnstile";

type TurnstileWidgetProps = {
  /** Wywoływane gdy użytkownik przejdzie challenge (lub gdy token wygaśnie → ""). */
  onToken: (token: string) => void;
  className?: string;
};

/**
 * Renderuje widget Cloudflare Turnstile TYLKO gdy ustawiono
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. W przeciwnym razie nie renderuje nic
 * (captcha domyślnie OFF — patrz `lib/checkout/turnstile.ts`).
 */
export function TurnstileWidget({ onToken, className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!isTurnstileEnabled()) return;
    let cancelled = false;

    loadTurnstile()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = api.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: "checkout",
          theme: "auto",
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => {
        /* Brak sieci/skryptu — nie blokuj UI; backend i tak waliduje. */
      });

    return () => {
      cancelled = true;
      const api = typeof window !== "undefined" ? window.turnstile : undefined;
      if (api && widgetIdRef.current) {
        try {
          api.remove(widgetIdRef.current);
        } catch {
          /* widget mógł już zniknąć */
        }
      }
    };
  }, []);

  if (!isTurnstileEnabled()) return null;
  return <div ref={containerRef} className={className} />;
}
