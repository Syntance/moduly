/**
 * Chaos e2e — symulacje awarii wokol checkoutu P24.
 *
 * Scenariusze bezpieczne dla produkcji (zadna platnosc nie jest domykana):
 *  1. double-click "Zamawiam i place" -> dokladnie JEDNA rejestracja platnosci,
 *  2. powrot z bramki z nieistniejacym cart_id -> spokojne "pending", nie crash,
 *  3. powrot z bramki bez internetu / backend down -> "pending", NIGDY "failed"
 *     (przedwczesne "failed" + mail "ponow platnosc" = podwojna wplata,
 *     incydent 06.07.2026).
 *
 * Koszyk siejemy przez Store API (proxy /api/medusa dokleja publishable key)
 * zamiast klikac PDP: wybor wariantow na PDP to ruletka (czesc kombinacji nie
 * ma wykonczenia -> CTA disabled), a przedmiotem testu jest CHECKOUT, nie PDP.
 *
 * UWAGA: regexy celowo uzywaja kropki zamiast polskich znakow ? odpornosc
 * na problemy z kodowaniem pliku na Windows (jak w checkout.e2e.spec.ts).
 */
import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const CONTACT = {
  email: "playwright+chaos@modulyconcept.test",
  firstName: "Jan",
  lastName: "Testowy",
  phone: "+48 600 000 000",
  postalCode: "00-001",
  address: "ul. Testowa 1/2",
  city: "Warszawa",
};

/**
 * Zasiewamy decyzje cookies PRZED zaladowaniem strony (klucz i format z
 * lib/consent/consent.ts) — banner potrafi zamontowac sie z opoznieniem i
 * zaslonic formularz w polowie kroku.
 */
async function seedCookieConsent(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "moduly.consent.v1",
        JSON.stringify({
          necessary: true,
          analytics: false,
          marketing: false,
          updatedAt: Date.now(),
          version: 1,
        }),
      );
    } catch {
      /* prywatny tryb */
    }
  });
}

/**
 * Tworzy koszyk z 1 pozycja przez Store API i zwraca cart_id. Pierwszy
 * dostepny wariant pierwszego opublikowanego produktu — line-items API nie
 * wymaga kompletu opcji PDP.
 */
async function seedCartViaApi(
  request: APIRequestContext,
  baseURL: string,
): Promise<string> {
  const api = `${baseURL.replace(/\/$/, "")}/api/medusa/store`;

  const regionsRes = await request.get(`${api}/regions`);
  expect(regionsRes.ok(), "GET /store/regions").toBeTruthy();
  const regionId = (await regionsRes.json()).regions?.[0]?.id as string;
  expect(regionId, "brak regionu").toBeTruthy();

  const productsRes = await request.get(
    `${api}/products?region_id=${encodeURIComponent(regionId)}&limit=5&fields=id,title,*variants`,
  );
  expect(productsRes.ok(), "GET /store/products").toBeTruthy();
  const products = (await productsRes.json()).products as Array<{
    variants?: Array<{ id: string }>;
  }>;
  const variantId = products?.flatMap((p) => p.variants ?? [])[0]?.id;
  expect(variantId, "brak wariantu do dodania").toBeTruthy();

  const cartRes = await request.post(`${api}/carts`, {
    data: { region_id: regionId },
  });
  expect(cartRes.ok(), "POST /store/carts").toBeTruthy();
  const cartId = (await cartRes.json()).cart?.id as string;
  expect(cartId, "brak cart_id").toBeTruthy();

  const lineRes = await request.post(`${api}/carts/${cartId}/line-items`, {
    data: { variant_id: variantId, quantity: 1 },
  });
  expect(lineRes.ok(), "POST line-items").toBeTruthy();

  return cartId;
}

async function fillContactStep(page: Page) {
  await page.getByRole("textbox", { name: /^email/i }).fill(CONTACT.email);
  await page.getByRole("textbox", { name: /^imi./i }).fill(CONTACT.firstName);
  await page.getByRole("textbox", { name: /^nazwisko/i }).fill(CONTACT.lastName);
  await page.getByRole("textbox", { name: /^telefon/i }).fill(CONTACT.phone);
  await page
    .getByRole("textbox", { name: /^kod pocztowy/i })
    .fill(CONTACT.postalCode);
  await page.getByRole("textbox", { name: /^adres/i }).fill(CONTACT.address);
  await page.getByRole("textbox", { name: /^miasto/i }).fill(CONTACT.city);
  await page.getByRole("button", { name: /przejd. do dostawy/i }).click();
}

async function goThroughShippingStep(page: Page) {
  await expect(
    page.getByRole("heading", { name: /spos.b dostawy/i }),
  ).toBeVisible({ timeout: 20_000 });
  await page
    .getByRole("button", { name: /kurier|paczkomat|odbi.r/i })
    .first()
    .click();
  const goToPayment = page.getByRole("button", {
    name: /przejd. do p.atno.ci/i,
  });
  await expect(goToPayment).toBeEnabled({ timeout: 20_000 });
  await goToPayment.click();
  await expect(
    page.getByRole("heading", { name: /p.atno../i }),
  ).toBeVisible({ timeout: 30_000 });
}

async function acceptConsents(page: Page) {
  await page
    .locator("label")
    .filter({ hasText: /akceptuj. regulamin/i })
    .getByRole("checkbox")
    .check();
  await page
    .locator("label")
    .filter({ hasText: /wyra.am zgod./i })
    .getByRole("checkbox")
    .check();
}

test.describe("Checkout ? chaos / awarie", () => {
  // Testy chodza tez przeciwko produkcji — pojedynczy retry amortyzuje
  // wariancje sieci (CDN, cold start funkcji), nie maskujac realnych bugow.
  test.describe.configure({ retries: 1 });

  test("double-click platnosci -> dokladnie jedna rejestracja (idempotencja)", async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(120_000);

    let prepareCheckoutCalls = 0;
    page.on("request", (req) => {
      if (
        req.method() === "POST" &&
        req.url().includes("/store/custom/prepare-checkout")
      ) {
        prepareCheckoutCalls += 1;
      }
    });

    await seedCookieConsent(page);
    const cartId = await seedCartViaApi(request, baseURL ?? "");
    await page.addInitScript(
      (id: string) => window.localStorage.setItem("moduly_cart_id", id),
      cartId,
    );

    await page.goto("/checkout");
    await fillContactStep(page);
    await goThroughShippingStep(page);
    await acceptConsents(page);

    const submit = page.getByRole("button", { name: /zamawiam i p.ac./i });
    await expect(submit).toBeEnabled();

    // prepare-checkout jest legalnie wolany takze WCZESNIEJ (krok dostawy) —
    // liczymy WYLACZNIE wywolania wywolane klikami submitu.
    prepareCheckoutCalls = 0;

    // Dwa kliki tak szybko, jak zdola Playwright — guard submittingRef musi
    // przepuscic tylko pierwszy. Drugi klik MUSI miec timeout: guard blokuje
    // przycisk (disabled) na czas redirectu, wiec klik bez timeoutu wisi w
    // nieskonczonosc na actionability (timeout:0 = default Playwrighta).
    await submit.click();
    await submit
      .click({ force: true, timeout: 3_000, noWaitAfter: true })
      .catch(() => undefined);

    // Submit konczy sie twarda nawigacja na /checkout/przelewy24/start
    // (desktop otwiera bramke w POPUPIE, wiec glowna karta zostaje na /start).
    await page.waitForURL(/checkout\/przelewy24\/start/i, { timeout: 60_000 });
    // Okno obserwacji na ewentualny drugi submit (asercja negatywna —
    // drugi POST musialby wyjsc w milisekundach po drugim kliku).
    await page.waitForTimeout(3_000);
    expect(prepareCheckoutCalls).toBe(1);
  });

  test("ponowne podejscie po anulowaniu -> /start wymusza retry=1 (swiezy link P24)", async ({
    page,
    request,
    baseURL,
  }) => {
    test.setTimeout(120_000);

    await seedCookieConsent(page);
    const cartId = await seedCartViaApi(request, baseURL ?? "");
    // Pre-seed znacznika P24_CART_CONTEXT (klucz z lib/medusa/checkout.ts):
    // symuluje, ze klient BYL JUZ kierowany do bramki dla tego koszyka
    // (znacznik czyscimy WYLACZNIE po sukcesie platnosci, wiec przezywa
    // powrot/anulowanie). Stary redirect_url jest wtedy zuzyty — ponowny
    // submit MUSI wymusic przerejestrowanie (retry=1), nie reuzycie martwego
    // linku (regresja: „przetwarzana" -> „nieudana" zamiast bramki P24).
    await page.addInitScript((id: string) => {
      window.localStorage.setItem("moduly_cart_id", id);
      window.sessionStorage.setItem(
        "moduly_p24_cart_context_v1",
        JSON.stringify({ cartId: id, at: Date.now() }),
      );
    }, cartId);

    await page.goto("/checkout");
    await fillContactStep(page);
    await goThroughShippingStep(page);
    await acceptConsents(page);

    const submit = page.getByRole("button", { name: /zamawiam i p.ac./i });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Kluczowa asercja: nawigacja na /start MUSI niesc retry=1 → swieza
    // rejestracja transakcji P24 zamiast martwego linku.
    await page.waitForURL(/checkout\/przelewy24\/start\?.*retry=1/i, {
      timeout: 60_000,
    });
  });

  test("powrot z bramki z nieistniejacym cart_id -> pending, nie crash", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await seedCookieConsent(page);
    await page.goto(
      "/checkout/przelewy24/return?cart_id=cart_CHAOS_NIE_ISTNIEJE",
    );
    // Backend odpowiada 404 -> klient traktuje jak niedostepnosc i po kilku
    // probach pokazuje spokojny stan przetwarzania (cron domknie, gdyby
    // platnosc jednak istniala). NIGDY nie moze tu byc twardego crasha.
    await expect(
      page.getByText(/p.atno.. jest przetwarzana/i).first(),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/p.atno.. nie powiod.a si./i)).toHaveCount(0);
  });

  test("powrot z bramki bez internetu (backend nieosiagalny) -> pending, nie failed", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await seedCookieConsent(page);
    // Symulacja zerwanej sieci: wszystkie strzaly statusowe padaja na poziomie
    // transportu, strona (SSR) laduje sie normalnie.
    await page.route("**/p24-return-status**", (route) => route.abort());

    await page.goto("/checkout/przelewy24/return?cart_id=cart_CHAOS_OFFLINE");

    await expect(
      page.getByText(/p.atno.. jest przetwarzana/i).first(),
    ).toBeVisible({ timeout: 60_000 });
    // Kontrprzyklad incydentu 06.07.2026: przy braku odpowiedzi backendu NIE
    // wolno oglosic porazki ani sugerowac ponownej platnosci.
    await expect(page.getByText(/p.atno.. nie powiod.a si./i)).toHaveCount(0);
  });
});
