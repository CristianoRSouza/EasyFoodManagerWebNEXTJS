import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Cpu,
  Receipt,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { APP_VERSION_LABEL } from "@/shared/version";

export const LOGIN_MARKETING_FEATURES = [
  { icon: Cpu, title: "Totens de autoatendimento", desc: "Pagamento de comandas pelo cliente, sem fila no caixa." },
  { icon: Receipt, title: "NFC-e em tempo real", desc: "Emissão fiscal automática ligada às vendas do totem." },
  { icon: Activity, title: "Comandas sincronizadas", desc: "Integração com o PDV e fecho de conta em tempo real." },
  { icon: BarChart3, title: "Receitas & métricas", desc: "Painéis de transações, CBS/IBS e desempenho por loja." },
  { icon: Sparkles, title: "Assistente com IA", desc: "Consultas de vendas e dúvidas fiscais no painel." },
  { icon: ShieldCheck, title: "Multi-tenant seguro", desc: "RLS por empresa, auditoria e licenciamento por loja." },
] as const;

export type LoginPageShellProps = {
  modeBadge: { icon: LucideIcon; label: string };
  title: string;
  subtitle: string;
  children: ReactNode;
  footerNote?: string;
};

/**
 * Layout partilhado do login (painel marketing + formulário à direita).
 * Usado em Modo Nuvem (Supabase) e Modo Local (Admin API) — só muda o conteúdo do formulário.
 */
export function LoginPageShell({
  modeBadge,
  title,
  subtitle,
  children,
  footerNote = "Protegido por RLS multi-tenant · Auditoria ponta a ponta",
}: LoginPageShellProps) {
  const ModeIcon = modeBadge.icon;

  return (
    <div className="dark grid min-h-screen lg:grid-cols-2 bg-background text-foreground">
      <div className="relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between bg-[hsl(224,40%,5%)]">
        <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_20%_20%,hsl(var(--primary))_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-[28rem] w-[28rem] rounded-full bg-[hsl(199,89%,48%)]/15 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/30 backdrop-blur">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-foreground">EasyFoodManager</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Admin Console · EasySoft Suite
            </div>
          </div>
        </div>

        <div className="relative space-y-10">
          <div className="space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Totens de autoatendimento · Comandas
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight text-foreground">
              Autoatendimento que
              <br />
              <span className="bg-gradient-to-r from-primary via-[hsl(173,70%,55%)] to-[hsl(199,89%,60%)] bg-clip-text text-transparent">
                fecha a comanda sem fila.
              </span>
            </h2>
            <p className="text-muted-foreground">
              Console administrativo dos totens de pagamento de comandas por autoatendimento: monitore terminais,
              transações TEF/PIX, emissão de NFC-e e licenciamento — em tempo real, multi-empresa e multi-loja.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {LOGIN_MARKETING_FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur transition-all hover:border-primary/40 hover:bg-card/70"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                  <f.icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-sm font-semibold text-foreground">{f.title}</div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} EasySoft · Todos os direitos reservados</span>
          <span className="font-mono">v{APP_VERSION_LABEL}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-center p-6 sm:p-12 bg-[hsl(224,32%,7%)]">
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(hsl(var(--border))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--border))_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

        <div className="relative w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/30">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">EasyFoodManager</div>
              <div className="text-xs text-muted-foreground">Admin Console</div>
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground mb-4">
              <ModeIcon className="h-3 w-3 text-primary" />
              {modeBadge.label}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-2 text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <p className="text-center text-xs text-muted-foreground">{footerNote}</p>
        </div>
      </div>
    </div>
  );
}
