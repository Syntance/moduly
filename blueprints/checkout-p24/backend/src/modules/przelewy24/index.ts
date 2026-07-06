import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import Przelewy24PaymentService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [Przelewy24PaymentService],
});
