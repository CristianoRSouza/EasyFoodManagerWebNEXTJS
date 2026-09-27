"use client";

import { CloudCog } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";

export function StoreGate({ loading, onSelect }: { loading: boolean; onSelect(): void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <CloudCog className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          {loading ? "Carregando empresas e lojas…" : "Selecione uma loja para continuar"}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {loading
            ? "Aguarde enquanto carregamos os acessos da sua conta."
            : "Para acessar os dados é necessário escolher a empresa e a loja onde deseja trabalhar."}
        </p>
      </div>
      {!loading && (
        <Button onClick={onSelect} size="lg" className="font-semibold">
          Selecionar loja
        </Button>
      )}
    </div>
  );
}
