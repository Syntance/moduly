import "server-only";

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
  setDataStore(createPostgresStore());

  configureMagazynForms({
    basePath: `${modulyConfig.basePath}/panel`,
    contactEmail: modulyConfig.email.contactEmail,
    contactPagePath: "/kontakt",
    privacyPagePath: "/polityka-prywatnosci",
    cookiesPagePath: "/polityka-cookies",
    accessibilityPagePath: "/deklaracja-dostepnosci",
    guardAdmin: requireAdminSessionForPanel,
  });
}
