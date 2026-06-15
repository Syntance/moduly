import type { MedusaContainer } from "@medusajs/framework/types";
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows";

const SYSTEM_PAYMENT_PROVIDER_ID = "pp_system_default";
const PRZELEWY24_PROVIDER_ID = "pp_przelewy24_przelewy24";
const STRIPE_PROVIDER_ID = "pp_stripe_stripe";
const TPAY_PROVIDER_ID = "pp_tpay_tpay";

function getDesiredProviderIds(): string[] {
  const ids = [SYSTEM_PAYMENT_PROVIDER_ID];

  if (
    process.env.FEATURE_P24 === "1" &&
    process.env.PRZELEWY24_MERCHANT_ID &&
    process.env.PRZELEWY24_API_KEY
  ) {
    ids.push(PRZELEWY24_PROVIDER_ID);
  }

  if (process.env.FEATURE_STRIPE === "1" && process.env.STRIPE_API_KEY) {
    ids.push(STRIPE_PROVIDER_ID);
  }

  if (
    process.env.FEATURE_TPAY === "1" &&
    process.env.TPAY_MERCHANT_ID &&
    process.env.TPAY_API_PASSWORD &&
    process.env.TPAY_SECURITY_CODE
  ) {
    ids.push(TPAY_PROVIDER_ID);
  }

  return ids;
}

export interface EnsureModulyPaymentResult {
  ok: boolean;
  messages: string[];
  updated_region_ids: string[];
  provider_ids: string[];
}

type RegionRow = {
  id: string;
  name?: string | null;
  payment_providers?: Array<{ id?: string }> | null;
};

export async function ensureModulyPayment(
  container: MedusaContainer,
): Promise<EnsureModulyPaymentResult> {
  const messages: string[] = [];
  const updated: string[] = [];

  const query = container.resolve("query") as {
    graph: (args: {
      entity: string;
      fields: string[];
      filters?: Record<string, unknown>;
    }) => Promise<{ data: RegionRow[] }>;
  };

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  });

  const desiredIds = getDesiredProviderIds();

  if (regions.length === 0) {
    return {
      ok: false,
      messages: ["Brak regionów — utwórz region (np. Polska) w Admin."],
      updated_region_ids: [],
      provider_ids: desiredIds,
    };
  }

  for (const region of regions) {
    const currentIds = (region.payment_providers ?? [])
      .map((p) => p?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    const missing = desiredIds.filter((id) => !currentIds.includes(id));

    if (missing.length === 0) {
      messages.push(
        `Region „${region.name ?? region.id}" ma już providery (${desiredIds.join(", ")}) — pomijam.`,
      );
      continue;
    }

    const nextIds = Array.from(new Set([...currentIds, ...desiredIds]));

    await updateRegionsWorkflow(container).run({
      input: {
        selector: { id: region.id },
        update: {
          payment_providers: nextIds,
        },
      },
    });

    updated.push(region.id);
    messages.push(
      `Region „${region.name ?? region.id}" → podpięto ${missing.join(", ")}.`,
    );
  }

  return {
    ok: true,
    messages,
    updated_region_ids: updated,
    provider_ids: desiredIds,
  };
}

export {
  SYSTEM_PAYMENT_PROVIDER_ID,
  PRZELEWY24_PROVIDER_ID,
  STRIPE_PROVIDER_ID,
  TPAY_PROVIDER_ID,
};
