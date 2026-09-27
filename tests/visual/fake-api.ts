import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

const [, , mode = "lan", portArg = "4999"] = process.argv;
const prefix = mode === "cloud" ? "/api/v1" : "/v1";

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: "u1", email: "admin@local.dev", typ: "access", exp: 4102444800 })}.fake`;

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*", "access-control-allow-headers": "*", ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

const cloudStores = [
  { id: "s1", company_id: "c1", trade_name: "Centro", legacy_store_code: "1", store_type: null, is_default: true },
  { id: "s2", company_id: "c1", trade_name: "Norte", legacy_store_code: "2", store_type: null, is_default: false },
];

createServer(async (req, res) => {
  const path = (req.url ?? "").split("?")[0] ?? "";
  if (req.method === "OPTIONS") return send(res, 204, undefined);
  if (path === "/health") return send(res, 200, { ok: true });

  if (path === `${prefix}/auth/login` && req.method === "POST") {
    const { email } = await readJson(req);
    if (mode === "lan" && email === "novo@loja.dev") {
      return send(res, 401, { error: "Senha local ainda não definida.", error_code: "local_password_not_set" });
    }
    if (mode === "lan") return send(res, 200, { access_token: jwt, token_type: "Bearer", expires_in: 28800 });
    return send(res, 200, { user: { id: "u1", email } }, { "set-cookie": "efa_session=fake; Path=/; HttpOnly; SameSite=Lax" });
  }
  if (mode === "cloud") {
    if (path === `${prefix}/auth/me`) return send(res, 200, { id: "u1", email: "admin@nuvem.dev" });
    if (path === `${prefix}/me/context`) {
      return send(res, 200, {
        user: { id: "u1", email: "admin@nuvem.dev" },
        is_system_admin: false,
        is_company_admin: false,
        companies: [{ id: "c1", name: "Empresa Demo", cnpj: "00.000.000/0001-00" }],
      });
    }
    if (path === `${prefix}/me/all-stores` || path === `${prefix}/me/stores`) return send(res, 200, cloudStores);
  }
  if (mode === "lan" && path === `${prefix}/site-identity`) return send(res, 200, { company_id: "cL", store_id: "sL" });
  return send(res, 404, { error: "not_found", message: "Não encontrado." });
}).listen(Number(portArg), "127.0.0.1");
