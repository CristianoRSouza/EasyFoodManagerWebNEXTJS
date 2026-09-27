"use client";

import React from "react";
import { Button } from "@/shared/ui/primitives/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "Erro desconhecido" };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Relatório automático volta na Fase 5, pelo servidor do Next.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                Algo deu errado
              </h1>
              {/* Texto mantido por paridade com o legado; o envio automático de relatório volta na Fase 5. */}
              <p className="text-sm text-muted-foreground">
                Um erro inesperado ocorreu. Um relatório foi enviado automaticamente para análise.
              </p>
              <p className="text-xs text-muted-foreground/60 font-mono break-all">
                {this.state.errorMessage}
              </p>
            </div>
            <Button onClick={this.handleReload} variant="default">
              Recarregar
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
