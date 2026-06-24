/** Max dłuższy bok obrazu CMS (upload + sync/build). */
export const CMS_IMAGE_MAX_LONG_EDGE = 1920;

/** Hero mobile — osobny kadrowany asset, mniejszy przy sync prebuild. */
export const MOBILE_HERO_MAX_LONG_EDGE = 1280;

/** WebP q92 — praktycznie bez widocznej straty, wyraźnie lżejsze niż JPEG z aparatu. */
export const CMS_IMAGE_WEBP_QUALITY = 92;

/** Limit uploadów CMS — hero, OG, galeria (10 MB po normalizacji serwerowej). */
export const MAX_CMS_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MAX_CMS_UPLOAD_MB = Math.floor(MAX_CMS_UPLOAD_BYTES / (1024 * 1024));

/** Vercel odrzuca body Server Actions > ~4.5 MB — kompresuj po stronie klienta przed wysłaniem. */
export const VERCEL_SAFE_UPLOAD_BYTES = 4 * 1024 * 1024;

export const VERCEL_SAFE_UPLOAD_MB = Math.floor(VERCEL_SAFE_UPLOAD_BYTES / (1024 * 1024));
