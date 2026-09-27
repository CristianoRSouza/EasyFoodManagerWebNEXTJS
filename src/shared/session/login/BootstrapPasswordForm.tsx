"use client";

import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Server } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { ApiError } from "@/shared/http/api-error";
import { sessionClient } from "@/shared/session/session-client";
import { LoginPageShell } from "./LoginPageShell";
import { LOCAL_PASSWORD_MAX_LENGTH, LOCAL_PASSWORD_MIN_LENGTH, bootstrapErrorMessage } from "./login-messages";
import { rememberedEmail } from "./remembered-email";

interface Props {
  email: string;
  onCancel(): void;
  onDone(): void;
}

export function BootstrapPasswordForm({ email, onCancel, onDone }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [provisioningCode, setProvisioningCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const validationError = (): string | null => {
    if (newPassword.length < LOCAL_PASSWORD_MIN_LENGTH) return `Senha local precisa de ≥ ${LOCAL_PASSWORD_MIN_LENGTH} caracteres`;
    if (newPassword.length > LOCAL_PASSWORD_MAX_LENGTH) return `Senha local não pode exceder ${LOCAL_PASSWORD_MAX_LENGTH} caracteres`;
    if (newPassword !== confirmPassword) return "As senhas não conferem";
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const problem = validationError();
    if (problem) {
      toast({ title: problem, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      try {
        await sessionClient.firstAccess({ email: email.trim(), newPassword, provisioningCode });
      } catch (error) {
        const code = error instanceof ApiError ? error.code : undefined;
        const fallback = error instanceof Error ? error.message : "Falha ao definir senha local.";
        toast({ title: "Não foi possível definir a senha local", description: bootstrapErrorMessage(code, fallback), variant: "destructive" });
        return;
      }
      try {
        await sessionClient.login(email.trim(), newPassword);
      } catch (error) {
        toast({
          title: "Senha gravada, mas falha no login local",
          description: error instanceof Error ? error.message : "Falha ao iniciar sessão local",
          variant: "destructive",
        });
        return;
      }
      // Senha nunca fica em memória depois do sucesso.
      setNewPassword("");
      setConfirmPassword("");
      setProvisioningCode("");
      rememberedEmail.save(email.trim());
      toast({ title: "Senha local cadastrada", description: "Nas próximas vezes utilize este email e esta senha para entrar." });
      // Nada do usuário anterior desta aba pode aparecer para quem acabou de entrar.
      queryClient.clear();
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LoginPageShell
      modeBadge={{ icon: Server, label: "Modo Local · Admin API" }}
      title="Primeiro acesso"
      subtitle="Defina a senha local deste usuário. Ela ficará guardada na base PostgreSQL deste servidor para os próximos logins."
      footerNote="Autenticação via Admin API · Dados no PostgreSQL local"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Conta:</span>{" "}
          <span className="font-mono text-foreground/90">{email.trim()}</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bootstrap-new-password">Nova senha local</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="bootstrap-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-9"
              placeholder={`Mínimo ${LOCAL_PASSWORD_MIN_LENGTH} caracteres`}
              disabled={submitting}
              autoFocus
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bootstrap-confirm-password">Confirmar senha</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="bootstrap-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-9"
              placeholder="Repita a senha"
              disabled={submitting}
            />
          </div>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">As senhas não conferem.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bootstrap-code">Código de primeiro acesso</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="bootstrap-code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={provisioningCode}
              onChange={(e) => setProvisioningCode(e.target.value)}
              className="pl-9 font-mono text-xs"
              placeholder="Cole aqui o código, se solicitado"
              disabled={submitting}
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Exigido apenas em servidores configurados para isso. O administrador gera o código no painel da nuvem (menu
            Infra → Códigos de primeiro acesso).
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            className="w-full"
            disabled={submitting || newPassword.length < LOCAL_PASSWORD_MIN_LENGTH || newPassword !== confirmPassword}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A gravar…
              </>
            ) : (
              "Cadastrar senha"
            )}
          </Button>
          <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-foreground" disabled={submitting} onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </LoginPageShell>
  );
}
