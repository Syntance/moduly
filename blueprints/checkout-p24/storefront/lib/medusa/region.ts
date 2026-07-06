import { medusa } from "./client";
import { isTransientMedusaError, sleep } from "./transient-error";

let cachedRegionId: string | null = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID ?? null;
let pendingPromise: Promise<string> | null = null;

const REGION_RETRY_DELAYS_MS = [0, 1500, 2500, 4000];

export async function getPolishRegionId(): Promise<string> {
  if (cachedRegionId) return cachedRegionId;

  if (pendingPromise) return pendingPromise;

  pendingPromise = (async () => {
    for (let attempt = 0; attempt < REGION_RETRY_DELAYS_MS.length; attempt++) {
      const pauseBefore = REGION_RETRY_DELAYS_MS[attempt] ?? 0;
      if (pauseBefore > 0) {
        await sleep(pauseBefore);
      }
      try {
        const response = await medusa.store.region.list();
        const plRegion = response.regions.find(
          (r) => r.countries?.some((c) => c.iso_2 === "pl"),
        );

        if (!plRegion) {
          throw new Error("Region PL nie znaleziony. Skonfiguruj region w Medusa Admin.");
        }

        cachedRegionId = plRegion.id;
        return cachedRegionId;
      } catch (e) {
        const canRetry =
          attempt < REGION_RETRY_DELAYS_MS.length - 1 && isTransientMedusaError(e);
        if (canRetry) {
          continue;
        }
        const fromEnv = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID?.trim();
        if (fromEnv) {
          cachedRegionId = fromEnv;
          return cachedRegionId;
        }
        throw e;
      }
    }
    throw new Error("getPolishRegionId: wyczerpano próby");
  })().finally(() => {
    pendingPromise = null;
  });

  return pendingPromise;
}
