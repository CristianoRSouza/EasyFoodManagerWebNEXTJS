import { Package } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import { SectionCard } from "./NfceDetailPrimitives";
import type { NfceCorrectionForm } from "./use-nfce-correction-form";

/** Aba "Correção", seção "Itens (fiscal)" — cópia fiel do legado (NCM/CFOP/CEST/CST-CSOSN editáveis). */
export function NfceCorrectionItemsSection({ form }: { form: NfceCorrectionForm }) {
  return (
    <SectionCard icon={<Package className="h-4 w-4 text-primary" />} title="Itens (fiscal)">
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>CFOP</TableHead>
              <TableHead>CEST</TableHead>
              <TableHead>CST/CSOSN</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {form.editableItems.map((row, idx) => (
              <TableRow
                key={row.item}
                id={`manual-correction-item-${row.item}`}
                className={form.errorItemNumbers.has(row.item) ? "bg-destructive/5" : ""}
              >
                <TableCell className="font-mono">{row.item}</TableCell>
                <TableCell>
                  <Input
                    value={row.ncm}
                    maxLength={8}
                    className={form.errorItemNumbers.has(row.item) ? "border-destructive focus-visible:ring-destructive" : ""}
                    onChange={(e) => form.updateItem(idx, { ncm: e.target.value.replace(/\D/g, "") })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.cfop}
                    maxLength={4}
                    className={form.errorItemNumbers.has(row.item) ? "border-destructive focus-visible:ring-destructive" : ""}
                    onChange={(e) => form.updateItem(idx, { cfop: e.target.value.replace(/\D/g, "") })}
                  />
                </TableCell>
                <TableCell>
                  <Input value={row.cest} maxLength={7} onChange={(e) => form.updateItem(idx, { cest: e.target.value.replace(/\D/g, "") })} />
                </TableCell>
                <TableCell>
                  <Input
                    value={row.icmsCstCsosn}
                    maxLength={4}
                    className={form.errorItemNumbers.has(row.item) ? "border-destructive focus-visible:ring-destructive" : ""}
                    onChange={(e) => form.updateItem(idx, { icmsCstCsosn: e.target.value.replace(/\D/g, "") })}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
