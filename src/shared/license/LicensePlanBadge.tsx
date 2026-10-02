import { Badge } from "@/shared/ui/primitives/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/primitives/tooltip";
import { Sparkles } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { getLicensePlanLabel, isDemoLicense } from "./license-labels";

export interface LicensePlanBadgeProps {
  licenseType?: string | null;
  planSlug?: string | null;
  /** Rótulo amigável já calculado (ex.: "Standard 1"). Sobrescreve o label automático. */
  displayLabel?: string | null;
  className?: string;
}

export function LicensePlanBadge({
  licenseType,
  planSlug,
  displayLabel,
  className,
}: LicensePlanBadgeProps) {
  const label = displayLabel?.trim() || getLicensePlanLabel(licenseType, planSlug);
  const demo = isDemoLicense(licenseType, planSlug);

  const badge = demo ? (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-amber-500/40 bg-amber-500/10 text-[10px] font-medium text-amber-700 dark:text-amber-400",
        className,
      )}
      title="Licença de demonstração — sem plano contratado"
    >
      <Sparkles className="h-3 w-3 shrink-0" />
      {label}
    </Badge>
  ) : (
    <Badge variant="outline" className={cn("text-[10px] font-medium", className)}>
      {label}
    </Badge>
  );

  if (!demo) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          Licença de demonstração — sem plano contratado
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
