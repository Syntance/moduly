import { MedusaService } from "@medusajs/framework/utils"
import ConfigOption from "./models/config-option"

export default class ProductConfigService extends MedusaService({
  ConfigOption,
}) {}
