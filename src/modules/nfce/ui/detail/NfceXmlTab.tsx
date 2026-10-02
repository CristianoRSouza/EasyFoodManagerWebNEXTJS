import { FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import type { NfceDetail } from "../../domain/nfce-detail";
import { SectionCard } from "./NfceDetailPrimitives";
import { NfceXmlPane } from "./NfceXmlPane";
import { buildXmlOptions, hasXml } from "./nfce-detail-labels";

/** Aba "XML" — mostra as variantes de XML certas para o status da nota — cópia fiel do legado. */
export function NfceXmlTab({ detail }: { detail: NfceDetail }) {
  const { note, documents } = detail;
  const isCancelled = note.status === "cancelled";
  const options = buildXmlOptions(note.status, documents, note.number);

  return (
    <div className="mt-4 space-y-4">
      <SectionCard icon={<FileText className="h-4 w-4 text-primary" />} title="XML da NFC-e">
        <div className="space-y-3">
          {isCancelled && (
            <p className="text-xs text-muted-foreground">
              Nota cancelada: disponibilizando XML autorizado e XML de cancelamento.
            </p>
          )}

          <Tabs defaultValue={options[0]?.key ?? "xml"}>
            <TabsList className="bg-muted/40">
              {options.map((option) => (
                <TabsTrigger key={option.key} value={option.key}>
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {options.map((option) => (
              <TabsContent key={option.key} value={option.key} className="space-y-3 mt-3">
                <NfceXmlPane
                  noteId={note.id}
                  kind={option.kind}
                  file={option.file}
                  detail={detail}
                  exists={hasXml(documents, option.kind)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </SectionCard>
    </div>
  );
}
