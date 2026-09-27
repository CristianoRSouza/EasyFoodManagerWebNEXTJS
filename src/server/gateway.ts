import "server-only";
import { readServerConfig, type ServerConfig } from "./config";
import { createSessionGateway } from "./session/gateway-factory";
import type { SessionGateway } from "./session/session-gateway";

let config: ServerConfig | null = null;
let gateway: SessionGateway | null = null;

export function getServerConfig(): ServerConfig {
  config ??= readServerConfig();
  return config;
}

export function getGateway(): SessionGateway {
  gateway ??= createSessionGateway(getServerConfig());
  return gateway;
}
