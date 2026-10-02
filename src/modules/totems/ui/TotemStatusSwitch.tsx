"use client";

import { useState } from "react";
import { Switch } from "@/shared/ui/primitives/switch";

interface TotemStatusSwitchProps {
  isActive: boolean;
  totemName: string;
  disabled?: boolean;
  disabledTitle?: string;
  onToggle: (newValue: boolean) => Promise<void> | Promise<boolean>;
}

/** Cópia fiel de `LEGACY/src/components/totem/TotemStatusSwitch.tsx`. */
export function TotemStatusSwitch({ isActive, totemName, onToggle, disabled = false, disabledTitle }: TotemStatusSwitchProps) {
  const [loading, setLoading] = useState(false);

  const handleChange = async (checked: boolean) => {
    setLoading(true);
    try {
      await onToggle(checked);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch
      checked={isActive}
      onCheckedChange={handleChange}
      disabled={loading || disabled}
      title={disabled ? disabledTitle : undefined}
      aria-label={`${isActive ? "Desativar" : "Ativar"} ${totemName}`}
    />
  );
}
