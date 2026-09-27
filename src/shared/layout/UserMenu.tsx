"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, LogOut, User } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/ui/primitives/dropdown-menu";
import { useToast } from "@/shared/ui/use-toast";
import { sessionClient } from "@/shared/session/session-client";
import { useSignOut } from "@/shared/session/use-sign-out";

export function UserMenu() {
  const handleSignOut = useSignOut();
  const { toast } = useToast();
  const [resetLoading, setResetLoading] = useState(false);
  const { data: user } = useQuery({ queryKey: ["session", "user"], queryFn: sessionClient.currentUser, staleTime: 5 * 60_000 });
  const email = user?.email;
  if (!email) return null;

  const handleResetPassword = async () => {
    setResetLoading(true);
    try {
      await sessionClient.requestPasswordReset(email);
      toast({ title: "Email enviado", description: "Verifique a sua caixa de entrada para redefinir a senha." });
    } catch (error) {
      toast({ title: "Erro ao enviar email", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <User className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Perfil</p>
            <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleResetPassword} disabled={resetLoading}>
          <KeyRound className="mr-2 h-4 w-4" />
          <span>{resetLoading ? "A enviar…" : "Redefinir senha"}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Terminar sessão</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
