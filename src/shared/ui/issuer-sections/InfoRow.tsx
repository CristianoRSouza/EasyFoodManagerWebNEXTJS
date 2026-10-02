import React from "react";
import { CloudFieldWarning } from "@/shared/ui/CloudFieldWarning";
import { cn } from "@/shared/ui/cn";
import { ISSUER_ROW } from "./responsive-tokens";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  /**
   * Quando `true` e `value` é vazio (null/undefined/string vazia), mostra um ícone
   * de warning indicando que o campo não tem fonte de dados na nuvem (Modo 3).
   */
  cloudUnavailable?: boolean;
  /** Mensagem customizada do tooltip de warning. */
  cloudWarningMessage?: string;
}

const isEmpty = (v: React.ReactNode): boolean =>
  v == null || (typeof v === "string" && v.trim() === "");

export const InfoRow = ({ label, value, mono, cloudUnavailable, cloudWarningMessage }: InfoRowProps) => {
  const empty = isEmpty(value);
  const showWarning = cloudUnavailable && empty;
  return (
    <div className={ISSUER_ROW.containerReadonly}>
      <span className={ISSUER_ROW.label}>
        {label}
        {showWarning && <CloudFieldWarning message={cloudWarningMessage} />}
      </span>
      <span className={cn(ISSUER_ROW.value, mono && "font-mono")}>
        {empty ? <span className="italic text-muted-foreground/60">—</span> : value}
      </span>
    </div>
  );
};
