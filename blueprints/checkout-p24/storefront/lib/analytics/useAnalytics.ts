"use client";

/**
 * STUB analytics — podmień na @moduly/analytics przy podpinaniu analityki.
 * API zgodne z produkcyjnym hookiem (track, identifyLead).
 */
export function useAnalytics() {
  return {
    track: (_event: string, _payload?: Record<string, unknown>) => {},
    identifyLead: (_email: string, _source?: string) => {},
  };
}
