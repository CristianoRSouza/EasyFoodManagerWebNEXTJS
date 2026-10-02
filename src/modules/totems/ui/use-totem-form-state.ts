"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/shared/ui/use-toast";
import {
  TOTEM_FORM_DEFAULTS,
  buildTotemSubmitPayload,
  computeTotemNameStatus,
  mapErrorsToTabs,
  omit,
  type TotemFormTab,
} from "../domain/totem-form";
import { validateTotemForm } from "../domain/totem-form-validate";
import {
  computeLicenseIsDemo,
  filterDialogSelectableLicenses,
  hasSomeLicense,
  resolveCurrentLicense,
} from "../domain/totem-license-policy";
import type { TotemConfig, TotemConfigFormData, TotemLicenseSlot, TotemSeriesStatus } from "../domain/totem-config";
import { decideSeriesOwnerAction, describeTotemSeriesOwner, type TotemSeriesOwner } from "../domain/totem-fiscal";
import type { TotemSeriesSaveOptions } from "../application/totem-repository";

/** Consulta do dono da série (`TotemRepository#seriesOwner`). */
export type TotemSeriesOwnerLookup = (
  serie: number,
  environment: number,
  totemId: string | null,
) => Promise<TotemSeriesOwner | null>;

export interface UseTotemFormStateArgs {
  open: boolean;
  totem?: TotemConfig | null;
  existingNames: string[];
  availableLicenses: TotemLicenseSlot[];
  cloudMode: boolean;
  licensePoolMode: boolean;
  localLicenseReadOnly: boolean;
  totemSeriesStatuses: TotemSeriesStatus[];
  onSubmit: (data: TotemConfigFormData, licenseId?: string | null, opts?: TotemSeriesSaveOptions) => Promise<void>;
  /** Sem ela, a série é tratada como livre — igual a uma consulta que falha no legado. */
  lookupSeriesOwner?: TotemSeriesOwnerLookup;
}

/**
 * Estado do formulário de totem — porta de `LEGACY/src/components/totem/TotemFormDialog.tsx`
 * (linhas 162-534: estado, efeitos de população, validação e submit). O JSX das abas fica em
 * componentes próprios (`TotemForm*Tab.tsx`), que só leem o que este hook devolve.
 */
export function useTotemFormState(args: UseTotemFormStateArgs) {
  const { open, totem, existingNames, availableLicenses, cloudMode, licensePoolMode, localLicenseReadOnly, totemSeriesStatuses, onSubmit, lookupSeriesOwner } = args;

  /** Licenças agora só são vinculadas pelo portal (cloud). No LAN o totem fica inativo até vínculo local (Demo). */
  const localPgOnly = !cloudMode;
  const isCloudTotemAdmin = cloudMode;
  const fiscalConfigTable = isCloudTotemAdmin ? "devices.totem_config" : "nfce_totem_config";
  const showLicenseTab = licensePoolMode || localLicenseReadOnly;

  const { toast } = useToast();
  const isEditing = !!totem;
  const [activeTab, setActiveTab] = useState<TotemFormTab>("geral");
  const [form, setForm] = useState<TotemConfigFormData>(TOTEM_FORM_DEFAULTS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [selectedLicenseId, setSelectedLicenseId] = useState<string | null>(null);
  /** Série do ambiente em uso presa a um totem inativo: aguardando o "Transferir e salvar". */
  const [pendingTransfer, setPendingTransfer] = useState<{
    owner: TotemSeriesOwner;
    payload: TotemConfigFormData;
  } | null>(null);

  const currentLicense = useMemo(() => resolveCurrentLicense(totem ?? null, availableLicenses), [totem, availableLicenses]);
  const selectedLicense = useMemo(
    () => availableLicenses.find((l) => l.id === selectedLicenseId) ?? null,
    [availableLicenses, selectedLicenseId],
  );
  const effectiveLicense = selectedLicense ?? currentLicense;

  const licenseIsDemo = useMemo(() => computeLicenseIsDemo(effectiveLicense, totem ?? null), [effectiveLicense, totem]);
  const temLicenca = hasSomeLicense(effectiveLicense, totem ?? null);
  const localPaidLicenseLock = localPgOnly && temLicenca && !licenseIsDemo;

  const selectableLicenses = useMemo(
    () => filterDialogSelectableLicenses(availableLicenses, licensePoolMode, totem?.id ?? null),
    [availableLicenses, licensePoolMode, totem?.id],
  );

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const isFirstOpen = !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!isFirstOpen) return;

    setActiveTab("geral");
    if (totem) {
      const rest = omit(totem, ["id", "created_at", "updated_at"] as const);
      const jaMarcado = (flag: unknown, cifra: unknown) => flag === true || (cifra != null && String(cifra).trim() !== "");
      const hasBoundLicense = !!currentLicense;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- repõe o formulário ao abrir/trocar de totem, mesmo comportamento do legado
      setForm({
        ...TOTEM_FORM_DEFAULTS,
        ...rest,
        is_active: licensePoolMode && !hasBoundLicense ? false : rest.is_active,
        aditum_partner_token: null,
        aditum_activation_code: null,
        aditum_partner_token_encrypted_set: jaMarcado(rest.aditum_partner_token_encrypted_set, rest.aditum_partner_token_encrypted),
        aditum_activation_code_encrypted_set: jaMarcado(rest.aditum_activation_code_encrypted_set, rest.aditum_activation_code_encrypted),
      });
    } else {
      setForm({ ...TOTEM_FORM_DEFAULTS, is_active: licensePoolMode && !localPgOnly });
    }
    setErrors({});
    setSelectedLicenseId(currentLicense?.id ?? null);
  }, [open, totem, currentLicense, licensePoolMode, localPgOnly]);

  useEffect(() => {
    if (!open || !licensePoolMode) return;
    const licenseId = currentLicense?.id ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza a seleção quando a licença carrega depois do diálogo aberto, mesmo comportamento do legado
    setSelectedLicenseId((prev) => (prev === licenseId ? prev : licenseId));
  }, [open, licensePoolMode, currentLicense?.id]);

  useEffect(() => {
    if (!open || !licenseIsDemo || form.app_mode !== "producao") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- licença Demo não permite modo Produção, mesmo comportamento do legado
    setForm((prev) => ({ ...prev, app_mode: "homologacao" }));
  }, [open, licenseIsDemo, form.app_mode]);

  useEffect(() => {
    if (!open || !licenseIsDemo || form.payment_environment !== "producao") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- licença Demo não permite ambiente Produção, mesmo comportamento do legado
    setForm((prev) => ({ ...prev, payment_environment: "homologacao" }));
  }, [open, licenseIsDemo, form.payment_environment]);

  useEffect(() => {
    if (!open || !licenseIsDemo || form.nfce_environment !== 1) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- licença Demo não permite tpAmb Produção na NFC-e, mesmo comportamento do legado
    setForm((prev) => ({ ...prev, nfce_environment: 2 }));
  }, [open, licenseIsDemo, form.nfce_environment]);

  const seriesForThisTotem = useMemo(() => {
    if (!isEditing || !totem?.id) return [];
    const serie = form.nfce_serie;
    return totemSeriesStatuses.filter((s) => {
      if (s.totem_config_id !== totem.id) return false;
      if (serie != null && s.serie !== serie) return false;
      return true;
    });
  }, [isEditing, totem, form.nfce_serie, totemSeriesStatuses]);

  const nextNumberLabel = (env: number): string => {
    const row = seriesForThisTotem.find((s) => s.environment === env);
    return row ? String(row.current_number + 1) : "—";
  };

  const set = (key: keyof TotemConfigFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleToggleActive = (next: boolean) => {
    if (next && localPaidLicenseLock) {
      toast({
        title: "Licença paga: ativação só pelo portal",
        description: "Este totem usa licença paga. Em conexão local só a licença Demo pode ser vinculada e ativada.",
        variant: "destructive",
      });
      return;
    }
    if (next && licensePoolMode && isEditing && !selectedLicenseId) {
      toast({
        title: "Sem licença configurada",
        description: "Vincule uma licença ao totem na aba “Licença” antes de ativá-lo.",
        variant: "destructive",
      });
      return;
    }
    set("is_active", next);
  };

  const onAppModeChange = (v: string) => {
    if (licenseIsDemo && v === "producao") {
      toast({
        title: "Modo Produção indisponível",
        description: "Com licença Demo só é permitido Demonstração ou Homologação. Vincule Standard/Pro na aba Licença.",
        variant: "destructive",
      });
      return;
    }
    set("app_mode", v);
  };

  const onNfceEnvironmentChange = (v: string) => {
    const n = Number(v);
    if (licenseIsDemo && n === 1) {
      toast({
        title: "Produção SEFAZ indisponível",
        description: "Com licença Demo use Homologação para emissão NFC-e.",
        variant: "destructive",
      });
      return;
    }
    set("nfce_environment", n);
  };

  const onPaymentEnvironmentChange = (v: string) => {
    if (licenseIsDemo && v === "producao") {
      toast({
        title: "Ambiente Produção indisponível",
        description: "Com licença Demo use Homologação para PIX/TEF.",
        variant: "destructive",
      });
      return;
    }
    set("payment_environment", v);
  };

  const nameStatus = computeTotemNameStatus(form.totem_name, isEditing, existingNames);
  const errorTabs = mapErrorsToTabs(errors);

  const validate = (): boolean => {
    const errs = validateTotemForm(form, { isEditing, existingNames, licenseIsDemo, licensePoolMode, selectedLicenseId });
    setErrors(errs);
    if (errs.license) setActiveTab("licenca");
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (): Promise<boolean> => {
    if (!validate()) return false;
    setSaving(true);
    try {
      const payload = buildTotemSubmitPayload(form, { isEditing, licenseIsDemo });

      // Legado 1.3.13 (PR #56): a série NFC-e tem um dono por emitente+série+ambiente. Se for de
      // outro totem, este não numera ("Could not allocate…" no totem). Pergunta antes de salvar; a
      // Admin API aplica a mesma regra (409) se a tela não perguntar. Nos modos de nuvem a série
      // não existe (é local).
      if (!isCloudTotemAdmin) {
        const owner = lookupSeriesOwner
          ? await lookupSeriesOwner(payload.nfce_serie ?? 1, payload.nfce_environment ?? 2, totem?.id ?? null).catch(() => null)
          : null;
        const action = decideSeriesOwnerAction(owner, payload.is_active === true);
        if (owner && action === "blocked") {
          setActiveTab("nfce");
          toast({
            title: "Série NFC-e em uso por outro totem ativo",
            description: `${describeTotemSeriesOwner(owner)} Dois totens ativos não podem usar a mesma série: escolha outra série ou desative o outro totem.`,
            variant: "destructive",
          });
          return false;
        }
        if (owner && action === "confirm_transfer") {
          setPendingTransfer({ owner, payload });
          return false;
        }
      }

      await onSubmit(payload, selectedLicenseId);
      return true;
    } finally {
      setSaving(false);
    }
  };

  /** "Transferir e salvar": reenvia o mesmo payload com `transfer_series_id` (legado `confirmTransfer`). */
  const confirmTransfer = async (): Promise<boolean> => {
    if (!pendingTransfer) return false;
    const { owner, payload } = pendingTransfer;
    setPendingTransfer(null);
    setSaving(true);
    try {
      await onSubmit(payload, selectedLicenseId, { transferSeriesId: owner.series_id });
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefaults = () => {
    setForm({ ...TOTEM_FORM_DEFAULTS, totem_name: isEditing ? form.totem_name : "" });
    setErrors({});
  };

  return {
    isEditing,
    licensePoolMode,
    activeTab,
    setActiveTab,
    form,
    errors,
    saving,
    set,
    selectedLicenseId,
    setSelectedLicenseId,
    localPgOnly,
    isCloudTotemAdmin,
    fiscalConfigTable,
    showLicenseTab,
    currentLicense,
    selectedLicense,
    selectableLicenses,
    licenseIsDemo,
    localPaidLicenseLock,
    nameStatus,
    errorTabs,
    seriesForThisTotem,
    nextNumberLabel,
    handleToggleActive,
    onAppModeChange,
    onNfceEnvironmentChange,
    onPaymentEnvironmentChange,
    handleSubmit,
    handleRestoreDefaults,
    pendingTransfer,
    setPendingTransfer,
    confirmTransfer,
  };
}

export type TotemFormState = ReturnType<typeof useTotemFormState>;
