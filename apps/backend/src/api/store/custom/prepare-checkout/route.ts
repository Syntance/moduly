import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import {
  addShippingMethodToCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
} from "@medusajs/medusa/core-flows";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { persistCartCheckoutMetadata } from "../../../../lib/cart-checkout-metadata";

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
  });
}

type Body = {
  cart_id?: string;
  option_id?: string;
  provider_id?: string;
  order_notes?: string;
};

/**
 * POST /store/custom/prepare-checkout
 *
 * Łączy 3 kroki checkoutu w jeden HTTP round-trip:
 *   1. dodanie metody dostawy (shipping method),
 *   2. utworzenie `payment_collection` dla koszyka (jeśli nie istnieje),
 *   3. utworzenie `payment_session` u wybranego providera (jeśli nie istnieje).
 *
 * Bez tego storefront robił 2 sekwencyjne requesty (addShippingMethod →
 * initiatePaymentSession), każdy ~600 ms network + workflow. Teraz jeden
 * request ~800 ms (workflows idą wewnętrznie, bez latencji HTTP między nimi).
 *
 * Endpoint jest idempotentny:
 *   - jeśli ta sama opcja dostawy jest już przypięta, Medusa w zasadzie
 *     nadpisuje ją (workflow sam obsługuje deduplikację per shipping_option),
 *   - payment_collection tworzone tylko jak nie istnieje,
 *   - payment_session tworzone tylko jak nie ma sesji dla podanego providera.
 *
 * WAŻNE: Przekazuje cart.email i cart_id do payment providera przez pole `data`
 * workflow. Przelewy24 wymaga poprawnego emaila już przy rejestracji transakcji.
 *
 * Zwraca świeży cart + identyfikatory, żeby storefront nie musiał robić
 * dodatkowego `cart.retrieve`.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  if (ratelimit) {
    const xForwardedFor = req.headers["x-forwarded-for"];
    const identifier = (typeof xForwardedFor === "string" ? xForwardedFor : xForwardedFor?.[0]) ?? "anonymous";
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

    if (!success) {
      return res.status(429).json({
        error: "Za dużo prób. Spróbuj ponownie za chwilę.",
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      });
    }

    res.setHeader("X-RateLimit-Limit", limit.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", reset.toString());
  }

  const body = (req.body ?? {});
  const cartId = body.cart_id?.trim();
  const optionId = body.option_id?.trim();
  const providerId = body.provider_id?.trim();
  const orderNotes = body.order_notes?.trim() ?? "";

  if (!cartId || !optionId || !providerId) {
    return res.status(400).json({
      message: "cart_id, option_id oraz provider_id są wymagane",
    });
  }

  const scope = req.scope;

  try {
    await addShippingMethodToCartWorkflow(scope).run({
      input: {
        cart_id: cartId,
        options: [{ id: optionId }],
      },
    });

    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
    const pcObject = remoteQueryObjectFromString({
      entryPoint: "cart",
      variables: { filters: { id: cartId } },
      fields: [
        "id",
        "email",
        "completed_at",
        "items.id",
        "payment_collection.id",
        "payment_collection.payment_sessions.id",
        "payment_collection.payment_sessions.provider_id",
        "payment_collection.payment_sessions.status",
      ],
    });
    const [cartSnapshot] = await remoteQuery(pcObject);
    if (!cartSnapshot) {
      return res.status(404).json({ message: `Cart ${cartId} not found` });
    }

    const snapshot = cartSnapshot as {
      completed_at?: string | null;
      items?: Array<{ id?: string }> | null;
    };
    if (snapshot.completed_at) {
      return res.status(400).json({
        message: "Koszyk został już sfinalizowany — nie można ponownie opłacić.",
        type: "cart_completed",
      });
    }
    if (!snapshot.items?.length) {
      return res.status(400).json({
        message: "Koszyk jest pusty — dodaj produkty przed płatnością.",
        type: "cart_empty",
      });
    }
    
    const cartEmail = (cartSnapshot as { email?: string }).email ?? "";

    let paymentCollectionId = (cartSnapshot as {
      payment_collection?: { id?: string };
    }).payment_collection?.id;

    if (!paymentCollectionId) {
      const { result } = await createPaymentCollectionForCartWorkflow(scope).run({
        input: { cart_id: cartId },
      });
      paymentCollectionId = (result as { id: string }).id;
    }

    const sessions =
      ((cartSnapshot as {
        payment_collection?: {
          payment_sessions?: Array<{ id: string; provider_id: string; status?: string }>;
        };
      }).payment_collection?.payment_sessions) ?? [];

    /**
     * Medusa wywala „active payment_session already exists" jeśli dla
     * payment_collection istnieje już session o statusie authorized/pending
     * z innym providerem. W ścieżce storefrontu mamy tylko jednego providera
     * (pp_system_default), więc ten warunek jest tu głównie defensywny.
     */
    const hasSessionForProvider = sessions.some(
      (s) => s.provider_id === providerId,
    );

    if (!hasSessionForProvider) {
      await createPaymentSessionsWorkflow(scope).run({
        input: {
          payment_collection_id: paymentCollectionId,
          provider_id: providerId,
          data: {
            cart_id: cartId,
            email: cartEmail,
          },
        },
      });
    }

    // Na końcu — po workflowach, żeby metadata nie została nadpisana.
    await persistCartCheckoutMetadata(scope, cartId, {
      orderNotes,
      paymentProviderId: providerId,
    });

    /**
     * Nie zwracamy tu pełnego snapshotu koszyka — storefront i tak robi
     * `getCart(cartId)` przez oficjalne `/store/carts/:id`, a drugi
     * remoteQuery z `defaultStoreCartFields` wywalał się na „Entity 'Cart'
     * does not have property 'region'” w naszym buildzie Medusy (join
     * `region.*` nie jest tu rozpoznawany). Zwrot jest teraz lekki i szybki.
     */
    return res.status(200).json({
      ok: true,
      payment_collection_id: paymentCollectionId,
    });
  } catch (e) {
    const err = e as { message?: string; type?: string; status?: number };
    console.error("[prepare-checkout] error", err);
    const status = err.status ?? 500;
    return res.status(status).json({
      message: err.message ?? "prepare-checkout failed",
      type: err.type,
    });
  }
}
