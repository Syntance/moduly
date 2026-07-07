import "server-only";

import { configureMagazynAnalytics } from "@moduly/magazyn-analytics";
import { configureMagazynSettings } from "@moduly/magazyn-settings";
import { configureMagazynModules } from "@moduly/magazyn-core";
import { configureMagazynForms } from "@moduly/magazyn-forms";
import { setDataStore } from "@moduly/data-store";
import { modulyConfig } from "../moduly.config";
import { createPostgresStore } from "./db";
import { requireAdminSessionForPanel } from "./auth";

let initialized = false;

/** Jednorazowa inicjalizacja Moduly przy starcie procesu Node. */
export function initModuly(): void {
  if (initialized) return;
  initialized = true;

  configureMagazynModules(modulyConfig);

  /**
   * Build bez sekretów (instalator moduly): `next build` zbiera page-data
   * bez .env.local — twardy throw na brak DATABASE_URL wywalał build
   * świeżo utworzonego projektu. Store podłączamy tylko gdy env jest;
   * bez niego runtime dostanie czytelny błąd przy pierwszym użyciu.
   */
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    setDataStore(createPostgresStore(databaseUrl));
  } else {
    console.warn(
      "[starter-strona] DATABASE_URL nie ustawione — DataStore nieaktywny (OK przy build; przed startem uzupełnij .env.local).",
    );
  }

  configureMagazynForms({
    basePath: `${modulyConfig.basePath}/panel`,
    contactEmail: modulyConfig.email.contactEmail,
    contactPagePath: "/kontakt",
    privacyPagePath: "/polityka-prywatnosci",
    cookiesPagePath: "/polityka-cookies",
    accessibilityPagePath: "/deklaracja-dostepnosci",
    guardAdmin: requireAdminSessionForPanel,
  });

  configureMagazynAnalytics({
    basePath: modulyConfig.basePath,
    guardAdmin: requireAdminSessionForPanel,
  });

  configureMagazynSettings({
    basePath: modulyConfig.basePath,
    commerceBackend: "none",
    guardAdmin: requireAdminSessionForPanel,
  });
}
