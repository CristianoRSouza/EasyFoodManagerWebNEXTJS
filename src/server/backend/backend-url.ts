import "server-only";
import type { ServerConfig } from "../config";

/** A easyfoodmanagerAPI responde em `/v1`; a EasyFoodAPI, em `/api/v1`. */
export function backendUrl(config: ServerConfig, path: string, search = ""): string {
  const prefix = config.backend === "cloud" ? "/api" : "";
  return `${config.apiUrl}${prefix}${path}${search}`;
}
