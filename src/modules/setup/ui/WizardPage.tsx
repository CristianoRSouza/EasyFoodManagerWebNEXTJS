"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Button } from "@/shared/ui/primitives/button";
import { WIZARD_STEPS } from "../domain/sync-env";
import { useWizardForm, type WizardForm } from "./use-wizard-form";
import { StepConnections, StepDatabases, StepFirebirdConfig, StepPrerequisites } from "./WizardStepsSetup";
import { StepConfirmation, StepInstallTest, StepWindowsService } from "./WizardStepsFinish";

function renderStep(step: number, form: WizardForm): ReactNode {
  switch (step) {
    case 0: return <StepPrerequisites {...form} />;
    case 1: return <StepDatabases {...form} />;
    case 2: return <StepConnections {...form} />;
    case 3: return <StepFirebirdConfig {...form} />;
    case 4: return <StepInstallTest {...form} />;
    case 5: return <StepWindowsService {...form} />;
    case 6: return <StepConfirmation />;
    default: return null;
  }
}

/**
 * Porta de `LEGACY/src/pages/Wizard.tsx` — Wizard de Instalação do Sync Service, 100% no
 * navegador (sem API). JSX, classes e textos copiados; os passos foram divididos em
 * `WizardStepsSetup`/`WizardStepsFinish` só pelo limite de tamanho de arquivo.
 */
export function WizardPage(): ReactNode {
  const [step, setStep] = useState(0);
  const form = useWizardForm();

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold font-heading">Wizard de Instalação</h1>

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s} className="flex items-center shrink-0">
            <button
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground font-medium"
                  : i < step
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <span className="font-mono text-xs">{i + 1}</span>
              <span className="hidden lg:inline">{s}</span>
            </button>
            {i < WIZARD_STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 shrink-0" />}
          </div>
        ))}
      </div>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="font-heading">{WIZARD_STEPS[step]}</CardTitle>
        </CardHeader>
        <CardContent>{renderStep(step, form)}</CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button onClick={() => setStep(s => s + 1)} disabled={step === WIZARD_STEPS.length - 1}>
          Próximo <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
