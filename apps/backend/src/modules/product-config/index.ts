import { Module } from "@medusajs/framework/utils"
import ProductConfigService from "./service"

export const PRODUCT_CONFIG_MODULE = "product_config"

export default Module(PRODUCT_CONFIG_MODULE, {
  service: ProductConfigService,
})
