import React from "react";
import { Input } from "@/shared/ui/primitives/input";
import { ISSUER_ROW } from "./responsive-tokens";

interface EditableInfoRowProps {
  label: string;
  value: string;
  field: string;
  onChange: (field: string, value: string) => void;
  type?: "text" | "number";
  maxLength?: number;
}

export const EditableInfoRow = ({ label, value, field, onChange, type = "text", maxLength }: EditableInfoRowProps) => (
  <div className={ISSUER_ROW.container}>
    <span className={ISSUER_ROW.label}>{label}</span>
    <Input
      className={ISSUER_ROW.input}
      type={type}
      value={value}
      maxLength={maxLength}
      onChange={(e) => onChange(field, e.target.value)}
    />
  </div>
);
