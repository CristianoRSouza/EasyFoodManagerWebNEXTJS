import { Badge } from "@/shared/ui/primitives/badge";
import { statusLabel } from "../domain/nfce-formatters";
import { statusColor } from "./nfce-badge-colors";

interface Props {
  status: string;
  className?: string;
}

export function NfceStatusBadge({ status, className }: Props) {
  return (
    <Badge className={`${statusColor(status)} border-0 ${className ?? ""}`} aria-label={`Status: ${statusLabel(status)}`}>
      {statusLabel(status)}
    </Badge>
  );
}
