import { AlertTriangle, CreditCard, FileText, Hash, Package, ScrollText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/primitives/tabs";
import { NfceCorrectionTab } from "./NfceCorrectionTab";
import { NfceHistoryTab } from "./NfceHistoryTab";
import { NfceItemsTab } from "./NfceItemsTab";
import { NfcePaymentsTab } from "./NfcePaymentsTab";
import { NfceSummaryTab } from "./NfceSummaryTab";
import { NfceXmlTab } from "./NfceXmlTab";
import type { NfceDetailBundle } from "./use-nfce-detail-query";

function TabCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
      {count}
    </span>
  );
}

/** As 6 abas do detalhe — cópia fiel do legado (`resumo`, `produtos`, `pagamentos`, `historico`, `xml`, `correcao`). */
export function NfceDetailTabs({ noteId, bundle, onSaved }: { noteId: string; bundle: NfceDetailBundle; onSaved: () => void }) {
  const { detail, items, payments, logs, events } = bundle;

  return (
    <Tabs defaultValue="resumo">
      <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex bg-muted/50">
        <TabsTrigger value="resumo" className="gap-1.5">
          <ScrollText className="h-4 w-4 hidden sm:inline" />
          Resumo
        </TabsTrigger>
        <TabsTrigger value="produtos" className="gap-1.5">
          <Package className="h-4 w-4 hidden sm:inline" />
          Produtos
          <TabCount count={items.length} />
        </TabsTrigger>
        <TabsTrigger value="pagamentos" className="gap-1.5">
          <CreditCard className="h-4 w-4 hidden sm:inline" />
          Pagamentos
          <TabCount count={payments.length} />
        </TabsTrigger>
        <TabsTrigger value="historico" className="gap-1.5">
          <Hash className="h-4 w-4 hidden sm:inline" />
          Histórico
        </TabsTrigger>
        <TabsTrigger value="xml" className="gap-1.5">
          <FileText className="h-4 w-4 hidden sm:inline" />
          XML
        </TabsTrigger>
        <TabsTrigger value="correcao" className="gap-1.5">
          <AlertTriangle className="h-4 w-4 hidden sm:inline" />
          Correção
        </TabsTrigger>
      </TabsList>

      <TabsContent value="resumo">
        <NfceSummaryTab detail={detail} />
      </TabsContent>
      <TabsContent value="produtos" className="mt-4">
        <NfceItemsTab items={items} />
      </TabsContent>
      <TabsContent value="pagamentos" className="mt-4 space-y-4">
        <NfcePaymentsTab payments={payments} />
      </TabsContent>
      <TabsContent value="historico">
        <NfceHistoryTab events={events} logs={logs} />
      </TabsContent>
      <TabsContent value="xml">
        <NfceXmlTab detail={detail} />
      </TabsContent>
      <TabsContent value="correcao">
        <NfceCorrectionTab noteId={noteId} bundle={bundle} status={detail.note.status} onSaved={onSaved} />
      </TabsContent>
    </Tabs>
  );
}
