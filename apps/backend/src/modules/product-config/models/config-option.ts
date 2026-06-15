import { model } from "@medusajs/framework/utils"

const ConfigOption = model.define("config_option", {
  id: model.id().primaryKey(),
  type: model.text(),
  name: model.text(),
  hex_color: model.text().nullable(),
  color_category: model.text().nullable(),
  mat_allowed: model.boolean().default(true),
  sort_order: model.number().default(0),
  metadata: model.json().nullable(),
})

export default ConfigOption
