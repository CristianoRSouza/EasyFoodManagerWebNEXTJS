"use client";

import { useState } from "react";
import { Switch } from "@/shared/ui/primitives/switch";

interface AgentStatusSwitchProps {
  isActive: boolean;
  agentName: string;
  onToggle: (newValue: boolean) => Promise<void>;
}

/** Cópia fiel de `components/agent/AgentStatusSwitch.tsx`. */
export function AgentStatusSwitch({ isActive, agentName, onToggle }: AgentStatusSwitchProps) {
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
      disabled={loading}
      aria-label={`${isActive ? "Desativar" : "Ativar"} ${agentName}`}
    />
  );
}
