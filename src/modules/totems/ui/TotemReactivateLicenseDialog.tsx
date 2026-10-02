"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { Button } from "@/shared/ui/primitives/button";
import { Label } from "@/shared/ui/primitives/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import { Alert, AlertDescription } from "@/shared/ui/primitives/alert";
import { AlertTriangle } from "lucide-react";
import { LicensePlanBadge } from "@/shared/license/LicensePlanBadge";
import type { TotemLicenseSlot } from "../domain/totem-config";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  totemName: string;
  freeLicenses: TotemLicenseSlot[];
  licenseLabelMap?: Map<string, string>;
  onConfirm: (licenseId: string) => Promise<void> | Promise<boolean>;
}

/** Cópia fiel de `LEGACY/src/components/totem/TotemReactivateLicenseDialog.tsx`. */
export function TotemReactivateLicenseDialog({
  open,
  onOpenChange,
  totemName,
  freeLicenses,
  licenseLabelMap = new Map(),
  onConfirm,
}: Props) {
  const [licenseId, setLicenseId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-seleciona a 1ª licença livre ao abrir, mesmo comportamento do legado
      setLicenseId(freeLicenses[0]?.id ?? "");
    }
  }, [open, freeLicenses]);

  const noLicenses = freeLicenses.length === 0;

  const handleConfirm = async () => {
    if (!licenseId) return;
    setSubmitting(true);
    try {
      const confirmed = await onConfirm(licenseId);
      if (confirmed !== false) onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reativar totem</DialogTitle>
          <DialogDescription>
            Selecione a licença que será vinculada a <span className="font-mono font-semibold">{totemName}</span>.
          </DialogDescription>
        </DialogHeader>

        {noLicenses ? (
          <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-foreground [&>svg]:text-amber-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Não há licenças livres para vincular. Contrate licenças extras no plano antes de reativar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="license-select">Licença disponível</Label>
            <Select value={licenseId} onValueChange={setLicenseId}>
              <SelectTrigger id="license-select">
                <SelectValue placeholder="Selecione uma licença" />
              </SelectTrigger>
              <SelectContent>
                {freeLicenses.map((l) => {
                  const friendly = licenseLabelMap?.get(l.id);
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      <span className="font-mono">{friendly ?? `Licença ${l.id.slice(0, 4)}`}</span>
                      <span className="ml-2 inline-flex">
                        <LicensePlanBadge licenseType={l.license_type} planSlug={l.plan_slug} displayLabel={friendly} />
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={noLicenses || !licenseId || submitting}>
            {submitting ? "Reativando..." : "Reativar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
