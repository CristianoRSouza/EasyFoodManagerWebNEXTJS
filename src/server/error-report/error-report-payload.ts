import "server-only";
import { z } from "zod";
import { maskObject } from "@/shared/errors/telemetry";
import type { SessionUser } from "../session/session-gateway";

/** Identidade fixa do painel no EasyGuardian — as constantes de `LEGACY/src/lib/error-reporter.ts`. */
export const SOURCE_APP = "EasyFoodManager";
export const SOURCE_PROJECT_ID = "d5bb6892-1559-41c8-8458-567d55a934eb";

/** Teto do corpo aceito — o mesmo que o navegador respeita (ver `report-limits.ts`). */
export { MAX_REPORT_BYTES } from "@/shared/errors/report-limits";

const text = z.string().max(64 * 1024);
const SCREENSHOT_PATTERN = /^data:image\/jpeg;base64,[A-Za-z0-9+/]*={0,2}$/;
const nullableText = text.nullable().optional();

/**
 * Forma do relatório que o navegador monta (a mesma do legado). Os limites dos registros são os
 * dos buffers circulares do legado: 100 linhas de console, 50 passos, 50 requisições.
 */
const schema = z.object({
  url: text,
  user_agent: text,
  error_message: text,
  error_stack: nullableText,
  component_stack: nullableText,
  console_logs: z.array(z.unknown()).max(100),
  steps: z.array(z.unknown()).max(50),
  // Só a captura que o navegador gera (`canvas.toDataURL("image/jpeg")`), nada de URL nem outro tipo.
  screenshot: z.string().regex(SCREENSHOT_PATTERN).nullable().optional(),
  metadata: z
    .object({ network: z.array(z.unknown()).max(50).optional() })
    .passthrough(),
});

export type ErrorReportPayload = z.infer<typeof schema> & {
  source_app: string;
  source_project_id: string;
  user_id: string | null;
  user_email: string | null;
  company_id: null;
};

/**
 * Valida o corpo e monta o que vai ao EasyGuardian. Quem é o usuário vem da SESSÃO (cookie
 * httpOnly), nunca do corpo; a origem (`source_app`/`source_project_id`) é fixa — o navegador não
 * consegue relatar em nome de outro sistema.
 */
export function buildErrorReport(body: unknown, user: SessionUser): ErrorReportPayload | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return null;
  // O navegador já redige (`telemetry.ts`); o servidor redige de novo porque o corpo vem do
  // cliente. A captura fica de fora: é base64, e a regex de JWT poderia corromper a imagem.
  const { screenshot, ...rest } = parsed.data;
  const masked = maskObject(rest) as typeof rest;
  return {
    ...masked,
    error_stack: masked.error_stack ?? null,
    component_stack: masked.component_stack ?? null,
    screenshot: screenshot ?? null,
    source_app: SOURCE_APP,
    source_project_id: SOURCE_PROJECT_ID,
    user_id: user.id,
    user_email: user.email,
    company_id: null,
  };
}
