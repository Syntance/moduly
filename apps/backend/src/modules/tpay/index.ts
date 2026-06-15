import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import TpayPaymentService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [TpayPaymentService],
});
