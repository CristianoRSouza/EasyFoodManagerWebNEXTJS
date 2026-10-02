import { Settings2 } from "lucide-react";
import { Badge } from "@/shared/ui/primitives/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { ResponsiveTableCell, ResponsiveTableHead, ResponsiveTableWrapper } from "@/shared/ui/issuer-sections/ResponsiveTable";
import { formatDateTime } from "@/shared/format/date-time";
import type { NfceAcbrConfig } from "../domain/nfce-issuer-config";

/** "Configuração ACBr" — cópia fiel do legado. */
export function AcbrConfigTable({ acbrConfigs }: { acbrConfigs: NfceAcbrConfig[] }) {
  return (
    <Card className="glass-panel">
      <CardHeader className="pb-2 pt-4 px-3 sm:px-5">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Settings2 className="h-4 w-4 text-primary" />
          Configuração ACBr
          {acbrConfigs.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-[10px] font-normal">
              {acbrConfigs.length} parâmetros
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {acbrConfigs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma configuração ACBr encontrada</p>
        ) : (
          <ResponsiveTableWrapper maxHeight="28rem">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] sm:w-[220px]">Chave</TableHead>
                  <TableHead className="w-[200px] sm:w-[260px]">Valor</TableHead>
                  <ResponsiveTableHead hideBelow="md">Descrição</ResponsiveTableHead>
                  <ResponsiveTableHead hideBelow="lg" className="w-[160px] text-right">
                    Atualizado em
                  </ResponsiveTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acbrConfigs.map((config) => (
                  <TableRow key={config.id} className="group">
                    <ResponsiveTableCell className="font-mono text-xs font-medium text-primary/80">{config.key}</ResponsiveTableCell>
                    <ResponsiveTableCell className="font-mono text-xs break-all">{config.value}</ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="md" className="text-xs text-muted-foreground">
                      {config.description ?? "—"}
                    </ResponsiveTableCell>
                    <ResponsiveTableCell hideBelow="lg" className="text-xs text-muted-foreground text-right">
                      {formatDateTime(config.updatedAt)}
                    </ResponsiveTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ResponsiveTableWrapper>
        )}
      </CardContent>
    </Card>
  );
}
