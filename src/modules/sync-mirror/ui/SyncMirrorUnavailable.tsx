import Link from "next/link";
import { Activity, CloudOff, LayoutDashboard } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { Card, CardContent } from "@/shared/ui/primitives/card";

/**
 * O que a rota mostra fora da loja — o mesmo cartão "Disponível apenas na loja" que o legado
 * mostra na nuvem (`!isSyncMirrorAvailable()` em `LEGACY/src/pages/SyncMirror.tsx`), com texto e
 * classes idênticos. O menu já esconde o item; isto cobre quem digita a URL.
 */
export function SyncMirrorUnavailable() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Espelho Firebird ↔ PostgreSQL</h1>
      <Card className="glass-panel border-warning/30">
        <CardContent className="space-y-4 px-6 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
            <CloudOff className="h-7 w-7 text-warning" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Disponível apenas na loja</h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
              Este espelho lê <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">sync_log</code> e{" "}
              <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs">sync_heartbeat</code> no
              PostgreSQL <strong className="font-medium text-foreground">da loja</strong>, alimentados pelo serviço
              que conversa com o Firebird do PDV. Na nuvem não existe nem o Firebird nem o serviço, e por isso não há
              o que espelhar.
            </p>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
              Abra o Manager no navegador da loja, apontado à Admin API local (
              <span className="font-mono text-foreground/90">http://127.0.0.1:4080</span>).
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/sync">
                <Activity className="mr-2 h-4 w-4" />
                Monitor de Sincronização
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Voltar ao Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
