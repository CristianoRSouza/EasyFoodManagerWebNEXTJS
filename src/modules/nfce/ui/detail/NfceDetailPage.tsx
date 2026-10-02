"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import { useToast } from "@/shared/ui/use-toast";
import { NfceDetailHeader } from "./NfceDetailHeader";
import { NfceDetailTabs } from "./NfceDetailTabs";
import { useNfceDetailQuery } from "./use-nfce-detail-query";

/** Detalhe de uma NFC-e (`/nfce/[id]`) — cópia fiel de `LEGACY/src/pages/NfceDetailPage.tsx`. */
export function NfceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const noteId = params.id;
  const query = useNfceDetailQuery(noteId);

  useEffect(() => {
    if (query.isError) {
      const description = query.error instanceof Error ? query.error.message : "Falha ao carregar nota";
      toast({ title: "Erro", description, variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isError]);

  if (query.isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="rounded-full bg-muted/50 p-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">Nota não encontrada</p>
        <Button variant="outline" onClick={() => router.push("/nfce")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const bundle = query.data;

  return (
    <div className="space-y-5">
      <NfceDetailHeader detail={bundle.detail} />
      <NfceDetailTabs noteId={noteId} bundle={bundle} onSaved={() => void query.refetch()} />
    </div>
  );
}
