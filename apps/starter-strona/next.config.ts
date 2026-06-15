import type { NextConfig } from "next";

const MODULY_PACKAGES = [
  "@moduly/auth-core",
  "@moduly/client-panel",
  "@moduly/cms",
  "@moduly/commerce",
  "@moduly/config",
  "@moduly/data-store",
  "@moduly/magazyn-categories",
  "@moduly/magazyn-content",
  "@moduly/magazyn-core",
  "@moduly/magazyn-emails",
  "@moduly/magazyn-forms",
  "@moduly/magazyn-orders",
  "@moduly/magazyn-products",
  "@moduly/magazyn-returns",
  "@moduly/payments",
  "@moduly/seo-geo",
  "@moduly/types",
  "@moduly/ui",
] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [...MODULY_PACKAGES],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
