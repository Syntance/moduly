"use client";

/**
 * STUB analytics â€” podmieĹ„ na @moduly/analytics przy podpinaniu analityki.
 * API zgodne z produkcyjnym hookiem (track, identifyLead).
 */
export function useAnalytics() {
  return {
    track: (_event: string, _payload?: Record<string, unknown>) => {},
    identifyLead: (
      _lead: { email: string; name?: string; source?: string },
    ) => {},
  };
}
