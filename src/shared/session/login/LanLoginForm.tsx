"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eraser, Loader2, Lock, Mail, Server } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { ApiError } from "@/shared/http/api-error";
import { sessionClient } from "@/shared/session/session-client";
import { BootstrapPasswordForm } from "./BootstrapPasswordForm";
import { LoginPageShell } from "./LoginPageShell";
import { purgeLegacyPasswordStorage } from "./legacy-storage";
import { NEEDS_BOOTSTRAP_CODES } from "./login-messages";
import { rememberedEmail } from "./remembered-email";
import { useExpiredSessionNotice } from "./use-expired-session-notice";

export function LanLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  useExpiredSessionNotice(useSearchParams());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura pós-montagem de localStorage por navegador (evita mismatch de hidratação)
    setEmail(rememberedEmail.read());
    purgeLegacyPasswordStorage();
  }, []);

  const handleLoginFailure = (error: unknown) => {
    if (error instanceof ApiError && NEEDS_BOOTSTRAP_CODES.has(error.code)) {
      setBootstrapping(true);
      toast({ title: "Primeiro acesso neste equipamento", description: "Defina uma senha local para esta base." });
      return;
    }
    if (error instanceof ApiError && error.code === "user_inactive") {
      toast({ title: "Usuário inativo", description: "Esta conta foi desativada. Contacte o administrador.", variant: "destructive" });
      return;
    }
    if (error instanceof ApiError && error.code === "backend_unreachable") {
      toast({ title: "URL da Admin API inacessível", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Não foi possível entrar",
      description: error instanceof Error ? error.message : "Falha no login",
      variant: "destructive",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast({ title: "Preencha email e senha", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await sessionClient.login(trimmedEmail, password);
      rememberedEmail.save(trimmedEmail);
      toast({ title: "Sessão iniciada" });
      router.replace("/");
    } catch (error) {
      handleLoginFailure(error);
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  };

  const clearSavedData = () => {
    rememberedEmail.clear();
    setEmail("");
    toast({ title: "Dados salvos removidos", description: "Email e URL da Admin API foram apagados deste navegador." });
  };

  if (bootstrapping) {
    return <BootstrapPasswordForm email={email} onCancel={() => setBootstrapping(false)} onDone={() => router.replace("/")} />;
  }

  return (
    <LoginPageShell
      modeBadge={{ icon: Server, label: "Modo Local · Admin API" }}
      title="Bem-vindo de volta"
      subtitle="Acesse sua conta para gerenciar totens, NFC-e e sincronização neste servidor."
      footerNote="Autenticação via Admin API · Dados no PostgreSQL local"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email" className="text-foreground">
            Email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
              placeholder="admin@local.dev"
              disabled={submitting}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password" className="text-foreground">
            Senha
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
              disabled={submitting}
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-11 glow-primary bg-primary hover:bg-primary/90" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              A entrar…
            </>
          ) : (
            "Entrar"
          )}
        </Button>
        <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground" disabled={submitting} onClick={clearSavedData}>
          <Eraser className="mr-2 h-4 w-4" />
          Limpar dados salvos
        </Button>
      </form>
    </LoginPageShell>
  );
}
