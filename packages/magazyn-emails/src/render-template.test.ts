import { describe, expect, it } from "vitest";
import { renderTemplate, sampleRenderContext } from "./render-template";
import { buildDefaultTemplate } from "./template-types";

describe("renderTemplate", () => {
	const ctx = sampleRenderContext();

	it("renderuje email-safe HTML z DOCTYPE i tabelami", () => {
		const { html } = renderTemplate(buildDefaultTemplate("placed"), ctx);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain('role="presentation"');
	});

	it("podstawia zmienne {{token}} w treści (szablon z {{imie}})", () => {
		const { html, text } = renderTemplate(buildDefaultTemplate("payment_failed"), ctx);
		expect(html).toContain("Anna");
		expect(text).toContain("Anna");
		expect(html).not.toContain("{{imie}}");
	});

	it("escapuje HTML w wartościach zmiennych", () => {
		const tpl = buildDefaultTemplate("payment_failed");
		const evil = { ...ctx, vars: { ...ctx.vars, imie: "<script>alert(1)</script>" } };
		const { html } = renderTemplate(tpl, evil);
		expect(html).not.toContain("<script>alert(1)</script>");
		expect(html).toContain("&lt;script&gt;");
	});

	it("dla szablonu z pozycjami pokazuje wiersz Razem", () => {
		const { text } = renderTemplate(buildDefaultTemplate("placed"), ctx);
		expect(text).toContain("Razem:");
	});

	it("podstawia {{linkPlatnosci}} w href przycisku payment_failed", () => {
		const retryUrl = "https://lumineconcept.pl/checkout/p24/retry?cart_id=cart_abc";
		const tpl = buildDefaultTemplate("payment_failed");
		const { html, text } = renderTemplate(tpl, {
			...ctx,
			vars: { ...ctx.vars, linkPlatnosci: retryUrl },
		});
		expect(html).toContain(`href="${retryUrl}"`);
		expect(html).not.toContain("{{linkPlatnosci}}");
		expect(text).toContain(retryUrl);
	});
});
