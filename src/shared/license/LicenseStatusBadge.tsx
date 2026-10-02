import { Badge } from "@/shared/ui/primitives/badge";
import { differenceInDays } from "date-fns";

interface Props {
  isActive: boolean | null;
  expiresAt: string | null;
}

export function LicenseStatusBadge({ isActive, expiresAt }: Props) {
  if (!isActive) {
    return <Badge variant="secondary" className="bg-muted text-muted-foreground">Inativa</Badge>;
  }

  if (expiresAt) {
    const daysLeft = differenceInDays(new Date(expiresAt), new Date());
    if (daysLeft < 0) {
      return <Badge variant="destructive">Expirada</Badge>;
    }
    if (daysLeft <= 7) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
          Expirando ({daysLeft}d)
        </Badge>
      );
    }
  }

  return (
    <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Ativa</Badge>
  );
}
