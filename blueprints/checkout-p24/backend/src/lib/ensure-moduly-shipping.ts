import type { IFulfillmentModuleService, MedusaContainer } from "@medusajs/framework/types";
import {
  batchLinksWorkflow,
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";

const LOCATION_NAME = "Magazyn PL";
const FULFILLMENT_SET_NAME = "Wysyłka";
const SERVICE_ZONE_NAME = "Polska";
const SHIPPING_PROFILE_NAME = "Moduly — standard";
const OPTION_NAME = "Kurier DPD";
const PICKUP_OPTION_NAME = "Odbiór osobisty";
/**
 * Medusa v2 trzyma ceny jako dziesiętne w walucie głównej (PLN), nie w groszach.
 * 24.99 = 24 zł 99 gr. W adminie wyświetla się jako „24,99 zł".
 */
const DPD_FLAT_AMOUNT = 24.99;

export interface EnsureModulyShippingResult {
  ok: boolean;
  messages: string[];
  stock_location_id?: string;
  fulfillment_set_id?: string;
  service_zone_id?: string;
  shipping_profile_id?: string;
  shipping_option_id?: string;
  skipped?: boolean;
}

async function listFulfillmentProviders(container: MedusaContainer) {
  const fulfillment = container.resolve(
    Modules.FULFILLMENT,
  ) as IFulfillmentModuleService;
  return fulfillment.listFulfillmentProviders({}, {});
}

async function listShippingOptionsForZone(
  container: MedusaContainer,
  serviceZoneId: string,
) {
  const fulfillment = container.resolve(
    Modules.FULFILLMENT,
  ) as IFulfillmentModuleService;
  return fulfillment.listShippingOptions({
    service_zone: { id: serviceZoneId },
  });
}

export async function ensureModulyShipping(
  container: MedusaContainer,
): Promise<EnsureModulyShippingResult> {
  const messages: string[] = [];
  const query = container.resolve("query") as {
    graph: (args: {
      entity: string;
      fields: string[];
      filters?: Record<string, unknown>;
    }) => Promise<{ data: Record<string, unknown>[] }>;
  };

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const defaultSc = salesChannels[0];
  if (!defaultSc?.id) {
    return {
      ok: false,
      messages: ["Brak sales channel — utwórz kanał w Admin."],
    };
  }
  messages.push(`Sales channel: ${defaultSc.name ?? defaultSc.id}`);

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  let stockLocationId = stockLocations.find(
    (l) => (l.name as string) === LOCATION_NAME,
  )?.id as string | undefined;
  if (!stockLocationId && stockLocations[0]?.id) {
    stockLocationId = stockLocations[0].id as string;
    messages.push(`Używam istniejącej lokalizacji: ${stockLocations[0].name}`);
  }

  if (!stockLocationId) {
    const { result: created } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: LOCATION_NAME,
            address: {
              address_1: "ul. Jana Pawła II",
              city: "Ryczów",
              country_code: "pl",
              postal_code: "34-115",
            },
          },
        ],
      },
    });
    const loc = created?.[0];
    if (!loc?.id) {
      return { ok: false, messages: ["Nie udało się utworzyć stock location."] };
    }
    stockLocationId = loc.id;
    messages.push(`Utworzono lokalizację: ${LOCATION_NAME}`);
  }

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocationId,
      add: [defaultSc.id as string],
      remove: [],
    },
  });
  messages.push("Powiązano lokalizację z sales channel.");

  const providers = (await listFulfillmentProviders(
    container,
  )) as unknown as Array<Record<string, unknown>>;
  const providerIds = providers
    .map((p) => String(p.id ?? ""))
    .filter(Boolean);
  messages.push(`Providers: ${providerIds.join(", ") || "(brak)"}`);

  const matchProvider = (needle: string) =>
    providers.find((p) => {
      const id = String(p.id ?? "").toLowerCase();
      const handle = String((p as { handle?: string }).handle ?? "").toLowerCase();
      const identifier = String(
        (p as { identifier?: string }).identifier ?? "",
      ).toLowerCase();
      const n = needle.toLowerCase();
      return (
        id === n ||
        handle === n ||
        identifier === n ||
        id.endsWith(`_${n}`) ||
        id.includes(`_${n}_`) ||
        id.includes(n)
      );
    });

  const dpdFp = matchProvider("dpd");
  const manualFp = matchProvider("manual");
  if (!dpdFp?.id) {
    return {
      ok: false,
      messages: [
        ...messages,
        "Brak fulfillment providera DPD. Sprawdź medusa-config (fulfillment providers).",
      ],
    };
  }

  const toLink = [dpdFp.id];
  if (manualFp?.id) toLink.push(manualFp.id);

  await batchLinksWorkflow(container).run({
    input: {
      create: toLink.map((fulfillment_provider_id) => ({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
        [Modules.FULFILLMENT]: { fulfillment_provider_id },
      })),
      update: [],
      delete: [],
    },
  });
  messages.push(`Podłączono fulfillment providers: ${toLink.join(", ")}`);

  const { data: locWithSets } = await query.graph({
    entity: "stock_location",
    fields: [
      "id",
      "fulfillment_sets.id",
      "fulfillment_sets.name",
      "fulfillment_sets.type",
    ],
    filters: { id: stockLocationId },
  });
  const loc = locWithSets[0] as
    | {
        fulfillment_sets?: {
          id: string;
          name?: string;
          type?: string;
        }[];
      }
    | undefined;

  const fulfillmentSet = loc?.fulfillment_sets?.find(
    (fs) => fs.name === FULFILLMENT_SET_NAME || fs.type === "shipping",
  );
  let fulfillmentSetId = fulfillmentSet?.id;

  if (!fulfillmentSetId) {
    await createLocationFulfillmentSetWorkflow(container).run({
      input: {
        location_id: stockLocationId,
        fulfillment_set_data: {
          name: FULFILLMENT_SET_NAME,
          type: "shipping",
        },
      },
    });
    const refetch = await query.graph({
      entity: "stock_location",
      fields: ["id", "fulfillment_sets.id", "fulfillment_sets.name"],
      filters: { id: stockLocationId },
    });
    const sets = (refetch.data[0] as { fulfillment_sets?: { id: string }[] })
      ?.fulfillment_sets;
    fulfillmentSetId = sets?.[sets.length - 1]?.id;
    messages.push("Dodano fulfillment set „Wysyłka”.");
  } else {
    messages.push("Fulfillment set już istnieje.");
  }

  if (!fulfillmentSetId) {
    return {
      ok: false,
      messages: [...messages, "Brak fulfillment_set_id."],
    };
  }

  const { data: zones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name", "fulfillment_set_id"],
    filters: { fulfillment_set_id: fulfillmentSetId },
  });
  let serviceZoneId = (zones as { id: string; name?: string }[]).find(
    (z) => z.name === SERVICE_ZONE_NAME,
  )?.id;

  if (!serviceZoneId) {
    const { result: sz } = await createServiceZonesWorkflow(container).run({
      input: {
        data: [
          {
            name: SERVICE_ZONE_NAME,
            fulfillment_set_id: fulfillmentSetId,
            geo_zones: [
              {
                type: "country",
                country_code: "pl",
              },
            ],
          },
        ],
      },
    });
    serviceZoneId = sz?.[0]?.id;
    messages.push("Utworzono strefę „Polska” (PL).");
  } else {
    messages.push("Strefa „Polska” już istnieje.");
  }

  if (!serviceZoneId) {
    return {
      ok: false,
      messages: [...messages, "Brak service_zone_id."],
    };
  }

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  });
  let shippingProfileId = (profiles as { id: string; name?: string }[]).find(
    (p) => p.name === SHIPPING_PROFILE_NAME,
  )?.id;

  if (!shippingProfileId) {
    const { result: prof } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: SHIPPING_PROFILE_NAME,
            type: "default",
          },
        ],
      },
    });
    shippingProfileId = prof?.[0]?.id;
    messages.push("Utworzono shipping profile.");
  }

  if (!shippingProfileId) {
    return {
      ok: false,
      messages: [...messages, "Brak shipping_profile_id."],
    };
  }

  const existingOptions = await listShippingOptionsForZone(
    container,
    serviceZoneId,
  );
  const dpdExisting = existingOptions.find((o) => o.name === OPTION_NAME);
  const pickupExisting = existingOptions.find(
    (o) => o.name === PICKUP_OPTION_NAME,
  );

  type CreateShippingOptionInput = {
    name: string;
    service_zone_id: string;
    shipping_profile_id: string;
    provider_id: string;
    data: Record<string, unknown>;
    type: { label: string; description: string; code: string };
    price_type: "flat";
    prices: { amount: number; currency_code: string }[];
  };

  const toCreate: CreateShippingOptionInput[] = [];

  if (dpdExisting) {
    messages.push(`Opcja „${OPTION_NAME}” już istnieje (${dpdExisting.id}).`);
  } else {
    toCreate.push({
      name: OPTION_NAME,
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      provider_id: String(dpdFp.id),
      data: {
        id: "dpd_courier",
      },
      type: {
        label: "Kurier",
        description: "DPD Polska",
        code: "dpd",
      },
      price_type: "flat",
      prices: [
        {
          amount: DPD_FLAT_AMOUNT,
          currency_code: "pln",
        },
      ],
    });
  }

  if (pickupExisting) {
    messages.push(
      `Opcja „${PICKUP_OPTION_NAME}” już istnieje (${pickupExisting.id}).`,
    );
  } else if (!manualFp?.id) {
    messages.push(
      "Brak fulfillment providera „manual” — pomijam odbiór osobisty (dodaj @medusajs/fulfillment-manual).",
    );
  } else {
    toCreate.push({
      name: PICKUP_OPTION_NAME,
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      provider_id: String(manualFp.id),
      data: {},
      type: {
        label: "Odbiór osobisty",
        description: "Odbiór w siedzibie — Ryczów (po umówieniu)",
        code: "pickup",
      },
      price_type: "flat",
      prices: [
        {
          amount: 0,
          currency_code: "pln",
        },
      ],
    });
  }

  if (toCreate.length > 0) {
    const { result: created } = await createShippingOptionsWorkflow(
      container,
    ).run({
      input: toCreate,
    });
    for (const row of created ?? []) {
      const r = row as { name?: string; id?: string };
      messages.push(`Utworzono opcję dostawy: ${r.name ?? "?"} (${r.id ?? "?"})`);
    }
  }

  const skipped = !!dpdExisting && !!pickupExisting && toCreate.length === 0;

  return {
    ok: true,
    skipped,
    messages,
    stock_location_id: stockLocationId,
    fulfillment_set_id: fulfillmentSetId,
    service_zone_id: serviceZoneId,
    shipping_profile_id: shippingProfileId,
    shipping_option_id: dpdExisting?.id ?? pickupExisting?.id,
  };
}
