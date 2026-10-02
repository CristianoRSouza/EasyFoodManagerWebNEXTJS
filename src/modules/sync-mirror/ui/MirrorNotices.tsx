import { cn } from "@/shared/ui/cn";

/**
 * Avisos de contagem do Espelho — porta de `AvisoContagem`/`AvisoInalterados` de
 * `LEGACY/src/components/sync-mirror/mirror-ui.tsx` (texto idêntico).
 *
 * É a nota que impede a tela de mentir sobre o que está contando: todos os dez jobs contam
 * escrita real desde 18/09/2026.
 */
export function CountNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      <strong className="font-medium text-foreground">Os números são escrita real.</strong> Todos os jobs contam
      linha de facto reescrita — registro lido e descartado por não ter mudado entra em{" "}
      <strong className="font-medium text-foreground">Inalterados</strong>, nunca em Gravados. E passagem de job sem
      nada a fazer não gera registro nenhum: por isso zero gravado com milhares de inalterados é o estado normal de
      uma loja aberta e sem mexer no catálogo.
    </p>
  );
}

export function UnchangedUnavailableNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      <strong className="font-medium text-warning">Inalterados indisponíveis nesta loja.</strong> A contagem de
      registros lidos e descartados por não terem mudado vem do resumo por minuto{" "}
      <span className="font-mono">sync_job_stats</span>, que esta loja ainda não recebeu. Enquanto a migração não
      for aplicada, a tela sabe dizer o que foi gravado, não o que foi comparado e descartado.
    </p>
  );
}
