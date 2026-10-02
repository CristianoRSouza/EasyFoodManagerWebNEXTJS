"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import type { MirrorEvent } from "../domain/sync-mirror";
import { SYNC_JOB_TABLES, explainCount, jobForLogLine } from "../domain/sync-jobs";
import { formatCount, formatDayTime } from "../domain/mirror-format";
import { CountNotice } from "./MirrorNotices";
import { DirectionTag, StatusTag } from "./mirror-ui";

function rowHint(e: MirrorEvent): string {
  const job = jobForLogLine(e.direction, e.table);
  return job ? explainCount(job) : "Par direção/tabela fora do catálogo de jobs conhecido.";
}

export interface EventsPanelProps {
  events: MirrorEvent[];
  page: number;
  pageSize: number;
  search: string;
  direction: string;
  table: string;
  status: string;
  onSearchChange: (v: string) => void;
  onDirectionChange: (v: string) => void;
  onTableChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onPageChange: (p: number) => void;
}

/**
 * Aba "Log do serviço": as linhas cruas da `sync_log` da pista FB↔PG, filtráveis — porta de
 * `LEGACY/src/components/sync-mirror/EventsPanel.tsx`. Paginação sem COUNT: "próxima" só
 * habilita quando a página veio cheia.
 */
export function EventsPanel({
  events,
  page,
  pageSize,
  search,
  direction,
  table,
  status,
  onSearchChange,
  onDirectionChange,
  onTableChange,
  onStatusChange,
  onPageChange,
}: EventsPanelProps) {
  const canAdvance = events.length === pageSize;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="espelho-busca"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="barcode, comanda, fb_id, texto do erro…"
            className="h-8 w-[16rem] pl-8 font-mono text-xs"
          />
        </div>

        <Select value={direction} onValueChange={onDirectionChange}>
          <SelectTrigger className="h-8 w-[9.5rem] text-xs">
            <SelectValue placeholder="Direção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Ambas as direções</SelectItem>
            <SelectItem value="fb_to_pg">FB ▸ PG</SelectItem>
            <SelectItem value="pg_to_fb">PG ▸ FB</SelectItem>
          </SelectContent>
        </Select>

        <Select value={table} onValueChange={onTableChange}>
          <SelectTrigger className="h-8 w-[13rem] text-xs">
            <SelectValue placeholder="Tabela" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tabelas</SelectItem>
            {SYNC_JOB_TABLES.map((t) => (
              <SelectItem key={t} value={t} className="font-mono text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 w-[11rem] text-xs">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="success">Só com efeito</SelectItem>
            <SelectItem value="error">Só atenção/erro</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={page === 0}
            onClick={() => onPageChange(Math.max(0, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[5.5rem] text-center font-mono text-xs tabular-nums text-muted-foreground">
            página {page + 1}
          </span>
          <Button variant="outline" size="sm" className="h-8" disabled={!canAdvance} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Cada linha é uma <strong className="font-medium text-foreground">passagem de job</strong>, não um registro —
        &ldquo;o job de produtos gravou 3&rdquo;. <em>Quais</em> foram os 3 está em{" "}
        <strong className="font-medium text-foreground">Alterações</strong>. Aqui fica o que não é gravação
        bem-sucedida: erro, conflito, adiamento, aborto.
      </p>
      <CountNotice />

      <Card className="glass-panel overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] uppercase tracking-wider">Quando</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Dir.</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Tabela</TableHead>
                  <TableHead className="text-right text-[10px] uppercase tracking-wider">Gravados</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Estado</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider">Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Nada encontrado neste filtro.
                    </TableCell>
                  </TableRow>
                )}
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {formatDayTime(e.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DirectionTag direction={e.direction} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.table}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums" title={rowHint(e)}>
                      {formatCount(e.recordsAffected)}
                    </TableCell>
                    <TableCell>
                      <StatusTag status={e.status} />
                    </TableCell>
                    <TableCell className="min-w-[22rem] max-w-[46rem] text-xs leading-snug text-muted-foreground">
                      {e.message ?? <span className="text-muted-foreground/60">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
