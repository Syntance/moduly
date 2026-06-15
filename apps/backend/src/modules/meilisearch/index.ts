import { Module } from "@medusajs/framework/utils";
import MeilisearchService from "./service";

export default Module("meilisearch", {
  service: MeilisearchService,
});
