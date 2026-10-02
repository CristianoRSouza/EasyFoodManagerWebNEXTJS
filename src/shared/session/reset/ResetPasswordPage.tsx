"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/primitives/card";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { APP_VERSION_LABEL } from "@/shared/version";
import type { SupabasePublicConfig } from "@/shared/runtime/ambiente";
import { adoptRecoverySession, configureRecoverySupabase, readRecoveryLink, updatePassword, verifyRecoveryToken } from "./password-recovery";

const MIN_PASSWORD_LENGTH = 8;

/** `supabase`: o projeto do ambiente, lido no servidor (`app/reset-password/page.tsx`). */
export function ResetPasswordPage({ supabase }: { supabase?: SupabasePublicConfig | null }) {
  // Antes de qualquer chamada (o efeito abaixo valida o link já na montagem).
  configureRecoverySupabase(supabase);
  const { toast } = useToast();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const link = readRecoveryLink(window.location.search, window.location.hash);
    const verify = async () => {
      if (!link) return false;
      return link.kind === "token_hash"
        ? verifyRecoveryToken(link.tokenHash)
        : adoptRecoverySession(link.accessToken, link.refreshToken);
    };
    verify()
      .catch(() => false)
      .then((ok) => {
        if (!active) return;
        setValidLink(ok);
        setChecking(false);
        if (ok) window.history.replaceState({}, document.title, "/reset-password");
        else if (link) toast({ title: "Link inválido ou expirado", variant: "destructive" });
      });
    return () => {
      active = false;
    };
  }, [toast]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      toast({ title: "Senha fraca", description: "Mínimo 8 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      toast({ title: "Senha atualizada", description: "Faça login com a nova senha." });
      router.replace("/login");
    } catch (error) {
      toast({
        title: "Não foi possível atualizar",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl font-heading text-foreground">Nova senha</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">Defina a sua nova senha de acesso. v{APP_VERSION_LABEL}</CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex items-center justify-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validando link de recuperação…
            </div>
          ) : !validLink ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground">
              <p className="font-medium">Link inválido ou expirado.</p>
              <p className="mt-1 text-muted-foreground">Solicite um novo email de recuperação a partir da tela de login.</p>
              <Button variant="outline" className="mt-4 w-full" onClick={() => router.replace("/login")}>
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password" className="text-foreground">
                  Nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-background border-input"
                    placeholder="••••••••"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-confirm" className="text-foreground">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="pl-9 bg-background border-input"
                    placeholder="••••••••"
                    disabled={submitting}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A guardar…
                  </>
                ) : (
                  "Guardar nova senha"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
