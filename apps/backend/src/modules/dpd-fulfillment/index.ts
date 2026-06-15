import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import DpdFulfillmentProviderService from "./services/dpd-fulfillment";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [DpdFulfillmentProviderService],
});
