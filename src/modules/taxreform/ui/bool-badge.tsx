import { Badge } from "@/shared/ui/primitives/badge";

/** Badge S/N para colunas booleanas das tabelas CST/IBS/CBS — mesmo padrão do legado. */
export function boolBadge(value: boolean) {
  return (
    <Badge variant={value ? "default" : "secondary"} className="text-xs">
      {value ? "S" : "N"}
    </Badge>
  );
}
