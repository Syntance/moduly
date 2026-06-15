import { Module } from "@medusajs/framework/utils";
import ReturnsModuleService, { RETURNS_MODULE } from "./service";

export default Module(RETURNS_MODULE, {
  service: ReturnsModuleService,
});
