import { getServerConfig } from "@/server/gateway";
import { ResetPasswordPage } from "@/shared/session/reset/ResetPasswordPage";

export const dynamic = "force-dynamic";

/** O Supabase do AMBIENTE vem do servidor em execução (sem rebuild por ambiente — legado 1.3.12, PR #48). */
export default function Page() {
  return <ResetPasswordPage supabase={getServerConfig().supabase} />;
}
