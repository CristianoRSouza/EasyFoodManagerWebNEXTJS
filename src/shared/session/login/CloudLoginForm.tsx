"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Cloud, Eraser, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { sessionClient } from "@/shared/session/session-client";
import { LoginPageShell } from "./LoginPageShell";
import { PasswordResetDialog } from "./PasswordResetDialog";
import { purgeLegacyPasswordStorage } from "./legacy-storage";
import { rememberedEmail } from "./remembered-email";
import { useExpiredSessionNotice } from "./use-expired-session-notice";

export function CloudLoginForm() {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  useExpiredSessionNotice(useSearchParams());

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura pós-montagem de localStorage por navegador (evita mismatch de hidratação)
    setEmail(rememberedEmail.read());
    purgeLegacyPasswordStorage();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Preencha email e senha", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await sessionClient.login(email, password);
      setPassword("");
      rememberedEmail.save(email.trim());
      toast({ title: "Sessão iniciada" });
      // Nada do usuário anterior desta aba pode aparecer para quem acabou de entrar.
      queryClient.clear();
      router.replace("/");
    } catch (error) {
      toast({
        title: "Não foi possível entrar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const clearSavedData = () => {
    rememberedEmail.clear();
    setEmail("");
    toast({ title: "Dados salvos removidos", description: "Email e URL foram apagados deste navegador." });
  };

  return (
    <LoginPageShell
      modeBadge={{ icon: Cloud, label: "Modo Nuvem · EasyFoodAPI" }}
      title="Bem-vindo de volta!"
      subtitle="Acesse sua conta para gerenciar totens, NFC-e e sincronização."
    >
      <>
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
                placeholder="usuário@empresa.com"
                disabled={submitting}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password" className="text-foreground">
                Senha
              </Label>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setResetOpen(true)}
                disabled={submitting}
              >
                Esqueci a senha
              </button>
            </div>
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground hover:text-foreground"
            disabled={submitting}
            onClick={clearSavedData}
          >
            <Eraser className="mr-2 h-4 w-4" />
            Limpar dados salvos
          </Button>
        </form>
        <PasswordResetDialog open={resetOpen} initialEmail={email} onOpenChange={setResetOpen} />
      </>
    </LoginPageShell>
  );
}
