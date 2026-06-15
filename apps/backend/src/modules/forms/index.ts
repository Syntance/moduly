import { Module } from "@medusajs/framework/utils";
import FormsModuleService, { FORMS_MODULE } from "./service";

export default Module(FORMS_MODULE, {
  service: FormsModuleService,
});
