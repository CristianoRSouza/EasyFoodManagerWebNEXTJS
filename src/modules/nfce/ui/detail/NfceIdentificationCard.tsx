import { ExternalLink, FileText } from "lucide-react";
import type { NfceDetail } from "../../domain/nfce-detail";
import { formatDate } from "../../domain/nfce-formatters";
import { NfceStatusBadge } from "../NfceStatusBadge";
import { EnvironmentBadge } from "./NfceDetailHeader";
import { InfoRow, SectionCard } from "./NfceDetailPrimitives";
import { finalidadeLabel, indIntermedLabel, presencaLabel, tipoEmissaoLabel } from "./nfce-detail-labels";

/** Aba Resumo, cartão "Identificação da Nota" — cópia fiel do legado. */
export function NfceIdentificationCard({ detail }: { detail: NfceDetail }) {
  const { note, identification, documents } = detail;
  const isCancelled = note.status === "cancelled";

  return (
    <SectionCard icon={<FileText className="h-4 w-4 text-primary" />} title="Identificação da Nota">
      <InfoRow label="Protocolo SEFAZ" value={note.protocol} mono />
      <InfoRow label="Número / Série" value={`${String(note.number).padStart(9, "0")} / ${String(note.serie).padStart(3, "0")}`} mono />
      <InfoRow label="Modelo" value={detail.model ? `${detail.model} (NFC-e)` : "65 (NFC-e)"} />
      <InfoRow label="Data de emissão" value={formatDate(note.issuedAt)} />
      <InfoRow label="Data autorização" value={formatDate(note.authorizedAt)} />
      {(isCancelled || documents.cancellationProtocol || documents.cancelledAt) && (
        <>
          <InfoRow
            label="Protocolo cancelamento (nProt)"
            value={documents.cancellationProtocol ?? "—"}
            mono
            highlight={isCancelled}
          />
          <InfoRow
            label="Registro cancelamento na SEFAZ"
            value={documents.cancelledAt ? formatDate(documents.cancelledAt) : "—"}
          />
        </>
      )}
      <InfoRow label="Status" value={<NfceStatusBadge status={note.statusText || note.status} />} />
      <InfoRow label="Ambiente" value={<EnvironmentBadge environment={identification?.environment ?? null} />} />
      <InfoRow label="Natureza" value={identification?.operationNature} />
      <InfoRow label="Tipo emissão" value={tipoEmissaoLabel(identification?.emissionType ?? null)} />
      <InfoRow label="Finalidade" value={finalidadeLabel(detail.emissionPurpose)} />
      <InfoRow label="Consumidor final" value={identification?.finalConsumer === 1 ? "Sim" : "Não"} />
      <InfoRow label="Presença" value={presencaLabel(identification?.presence ?? null)} />
      <InfoRow label="Intermediador (indIntermed)" value={indIntermedLabel(identification?.intermediary)} />
      {identification?.processVersion && <InfoRow label="Versão processo" value={identification.processVersion} mono />}
      {detail.queryUrl && (
        <InfoRow
          label="URL consulta"
          value={
            <a href={detail.queryUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline text-xs break-all">
              {detail.queryUrl}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          }
        />
      )}
      {note.returnCode && (
        <InfoRow
          label="Retorno SEFAZ"
          value={
            <span className={note.status === "rejected" ? "text-destructive" : ""}>
              {note.returnCode} — {note.returnReason ?? ""}
            </span>
          }
          highlight={note.status === "rejected"}
        />
      )}
    </SectionCard>
  );
}
