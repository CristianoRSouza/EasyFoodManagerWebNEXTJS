import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { cn } from "@/shared/ui/cn";
import { ISSUER_CARD } from "./responsive-tokens";

interface IssuerSectionCardProps {
  /** Ícone à esquerda do título (lucide). */
  icon: ReactNode;
  /** Título da seção (ex.: "Dados da Empresa"). */
  title: ReactNode;
  /** Conteúdo extra à direita do título (badge, warning, etc.). */
  titleExtra?: ReactNode;
  /** Descrição opcional abaixo do título (small print). */
  description?: ReactNode;
  /** Conteúdo do corpo do card. */
  children: ReactNode;
  /** Classe adicional no container do card. */
  className?: string;
  /** Classe adicional no CardContent. */
  contentClassName?: string;
}

/**
 * Wrapper padronizado para os cards de seção do Emitente NFC-e.
 *
 * Centraliza paddings mobile-first (px-3 sm:px-5), tipografia do título
 * e estilo `glass-panel`. Use sempre que adicionar uma nova seção dentro
 * das abas de Cadastro/ACBr ou Reforma Tributária.
 */
export function IssuerSectionCard({
  icon,
  title,
  titleExtra,
  description,
  children,
  className,
  contentClassName,
}: IssuerSectionCardProps) {
  return (
    <Card className={cn(ISSUER_CARD.root, className)}>
      <CardHeader className={ISSUER_CARD.header}>
        <CardTitle className={ISSUER_CARD.title}>
          <span className="text-primary inline-flex items-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          <span className="break-words">{title}</span>
          {titleExtra}
        </CardTitle>
        {description ? (
          <p className="text-xs text-muted-foreground font-normal normal-case pt-1">
            {description}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className={cn(ISSUER_CARD.content, contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
