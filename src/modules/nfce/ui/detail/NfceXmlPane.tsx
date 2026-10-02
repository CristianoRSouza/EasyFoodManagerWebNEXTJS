"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Skeleton } from "@/shared/ui/primitives/skeleton";
import type { NfceDetail } from "../../domain/nfce-detail";
import { prettifyXml } from "../../domain/nfce-formatters";
import type { NfceXmlKind } from "../../domain/nfce-xml";
import { useNfceRepository } from "../use-nfce-repository";

function downloadXml(xml: string, fileName: string): void {
  const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * O XML de uma aba, carregado quando ela abre — cópia fiel de `XmlPane` do legado.
 *
 * Fica num componente próprio porque o `Tabs` só monta a aba ATIVA: montar é o gatilho da busca,
 * e nenhuma outra aba paga por isso.
 */
export function NfceXmlPane({
  noteId,
  kind,
  file,
  detail,
  exists,
}: {
  noteId: string;
  kind: NfceXmlKind;
  file: string;
  detail: NfceDetail;
  exists: boolean;
}) {
  const repository = useNfceRepository();
  const [xml, setXml] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">(() => (exists ? "loading" : "ready"));

  // Troca de nota/tipo de XML volta ao estado inicial, ajustado durante a renderização (não em
  // efeito) — mesmo padrão de `use-nfce-correction-form.ts`. O efeito abaixo só busca; nenhum
  // `setState` síncrono sobra nele (ver `react-hooks/set-state-in-effect`).
  const requestKey = `${noteId}:${kind}:${exists}`;
  const [trackedKey, setTrackedKey] = useState(requestKey);
  if (trackedKey !== requestKey) {
    setTrackedKey(requestKey);
    setXml(null);
    setState(exists ? "loading" : "ready");
  }

  useEffect(() => {
    if (!exists) return;
    let alive = true;
    repository
      .xml(noteId, kind, detail)
      .then((content) => {
        if (!alive) return;
        setXml(content);
        setState("ready");
      })
      .catch(() => {
        // Falhar aqui é diferente de não existir: o XML existe e não veio. Dizer "indisponível"
        // mandaria o usuário procurar um problema fiscal que não há.
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [noteId, kind, detail, exists, repository]);

  if (state === "loading") {
    return <Skeleton className="h-[240px] w-full rounded-lg" />;
  }
  if (state === "error") {
    return (
      <div className="rounded-md border border-dashed border-destructive/50 p-4 text-sm text-destructive">
        Não foi possível carregar o XML. Tente novamente.
      </div>
    );
  }
  if (!xml) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        XML indisponível para este status
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => downloadXml(xml, file)}>
          <Download className="h-4 w-4 mr-1.5" />
          Baixar
        </Button>
      </div>
      <pre className="max-h-[min(70vh,560px)] overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-[11px] leading-snug font-mono text-foreground whitespace-pre">
        {prettifyXml(xml)}
      </pre>
    </>
  );
}
