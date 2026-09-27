"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/primitives/dialog";
import { Input } from "@/shared/ui/primitives/input";
import { Label } from "@/shared/ui/primitives/label";
import { useToast } from "@/shared/ui/use-toast";
import { sessionClient } from "@/shared/session/session-client";

interface Props {
  open: boolean;
  initialEmail: string;
  onOpenChange(open: boolean): void;
}

export function PasswordResetDialog({ open, initialEmail, onOpenChange }: Props) {
  const { toast } = useToast();
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [lastInitial, setLastInitial] = useState(initialEmail);
  if (initialEmail !== lastInitial) {
    setLastInitial(initialEmail);
    setEmail(initialEmail);
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      toast({ title: "Indique o seu email", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await sessionClient.requestPasswordReset(email);
      toast({ title: "Email enviado", description: "Verifique a sua caixa de entrada." });
      onOpenChange(false);
      setEmail("");
    } catch (error) {
      toast({
        title: "Falha ao enviar email",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar senha</DialogTitle>
          <DialogDescription>Enviaremos um link para o seu email com instruções.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="text-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-11 bg-card/60 border-border focus-visible:border-primary"
                placeholder="usuário@empresa.com"
                disabled={submitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A enviar…
                </>
              ) : (
                "Enviar email"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
