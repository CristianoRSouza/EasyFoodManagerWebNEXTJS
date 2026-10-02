"use client";

import type { ReactNode } from "react";
import { Ruler, CheckCircle, XCircle } from "lucide-react";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { Badge } from "@/shared/ui/primitives/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { useUnitsQuery } from "./use-units-query";
import { formatDate } from "@/shared/format/date-time";

export function UnitsPage(): ReactNode {
  const { data: units = [], isLoading, refetch } = useUnitsQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Unidades de Medida</h1>
          <p className="text-muted-foreground">Cadastro de Unidades</p>
        </div>
        <PageRefreshButton onClick={() => refetch()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            Unidades ({units.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando…</p>
          ) : units.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhuma unidade cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cód. Legado</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Fracionável</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono">{u.legacyCode}</TableCell>
                    <TableCell className="font-semibold">{u.shortDescription}</TableCell>
                    <TableCell>{u.description}</TableCell>
                    <TableCell className="text-center">
                      {u.isFractional ? (
                        <Badge variant="secondary">Sim</Badge>
                      ) : (
                        <Badge variant="outline">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {u.isActive ? (
                        <CheckCircle className="h-4 w-4 text-primary mx-auto" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatDate(u.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
