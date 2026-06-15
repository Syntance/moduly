import { defineMiddlewares } from "@medusajs/medusa";
import { createRateLimit } from "../lib/rate-limit";

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/*",
      middlewares: [],
    },
    /**
     * Globalny rate-limit anti-abuse na mutujących endpointach store.
     * Fail-open bez Upstash (patrz lib/rate-limit). Limity dobrane tak, by nie
     * blokować normalnego, wielokrokowego checkoutu z jednego IP.
     */
    {
      matcher: "/store/custom/*",
      method: ["POST"],
      middlewares: [
        createRateLimit({ prefix: "rl:store-custom", limit: 60, window: "1 m" }),
      ],
    },
    {
      matcher: "/store/carts/:id/complete",
      method: ["POST"],
      middlewares: [
        createRateLimit({ prefix: "rl:cart-complete", limit: 20, window: "1 m" }),
      ],
    },
    {
      matcher: "/admin/uploads",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/admin/products/:id",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/admin/products/:id/text-fields",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },
    {
      matcher: "/admin/product-categories/:id",
      method: ["POST"],
      bodyParser: { sizeLimit: "10mb" },
    },
  ],
});
