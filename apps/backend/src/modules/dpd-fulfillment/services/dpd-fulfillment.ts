import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils";

type DpdProviderOptions = {
  login?: string;
  password?: string;
  fid?: string;
};

/**
 * Fulfillment provider DPD dla modułu `@medusajs/medusa/fulfillment`.
 * W Adminie pojawi się jako `fp_dpd_dpd` — przy tworzeniu Shipping option wybierz ten provider
 * i fulfillment option „DPD Kurier”.
 *
 * Cena: ustaw **Fixed** w shipping option (provider nie liczy dynamicznie).
 * Pełna integracja API DPD (etykiety) — w `createFulfillment` później.
 */
export default class DpdFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "dpd";

  protected options_: DpdProviderOptions;

  constructor(
    _container: Record<string, unknown>,
    options: DpdProviderOptions = {},
  ) {
    super();
    this.options_ = options ?? {};
  }

  async getFulfillmentOptions() {
    return [
      {
        id: "dpd_courier",
        name: "DPD Kurier",
      },
    ];
  }

  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>,
  ) {
    return data;
  }

  async calculatePrice(
    _optionData: Record<string, unknown>,
    _data: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
    throw new Error(
      "DPD provider: użyj ceny stałej (Fixed) w shipping option — brak dynamicznego cennika.",
    );
  }

  async canCalculate() {
    return false;
  }

  async validateOption(_data: Record<string, unknown>) {
    return true;
  }

  async createFulfillment() {
    // TODO: wywołanie API DPD (SOAP) — patrz src/modules/dpd/service.ts
    return {
      data: {
        provider: "dpd",
        configured: !!(this.options_.login && this.options_.password && this.options_.fid),
      },
      labels: [],
    };
  }

  async cancelFulfillment() {
    return {};
  }
}
