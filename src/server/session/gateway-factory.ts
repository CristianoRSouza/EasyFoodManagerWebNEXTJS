import "server-only";
import type { ServerConfig } from "../config";
import { CloudSessionGateway } from "./cloud-session-gateway";
import { LanSessionGateway } from "./lan-session-gateway";
import type { SessionGateway } from "./session-gateway";

export function createSessionGateway(config: ServerConfig, fetchFn: typeof fetch = fetch): SessionGateway {
  return config.backend === "cloud" ? new CloudSessionGateway(config, fetchFn) : new LanSessionGateway(config, fetchFn);
}
