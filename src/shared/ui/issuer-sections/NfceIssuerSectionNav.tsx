import type { ReactNode } from "react";
import Link from "next/link";
import { Building2, TrendingUp } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";

type NfceIssuerSection = "issuer" | "fiscal";

const sections = [
  {
    id: "issuer" as const,
    label: "Cadastro e ACBr",
    href: "/nfce-issuer",
    icon: Building2,
  },
  {
    id: "fiscal" as const,
    label: "Reforma Tributária",
    href: "/nfce-issuer-fiscal",
    icon: TrendingUp,
  },
] satisfies Array<{
  id: NfceIssuerSection;
  label: string;
  href: string;
  icon: typeof Building2;
}>;

interface NfceIssuerSectionNavProps {
  active: NfceIssuerSection;
  description: string;
  actions?: ReactNode;
}

export function NfceIssuerSectionNav({ active, description, actions }: NfceIssuerSectionNavProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold font-heading">Emitente NFC-e</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="shrink-0 self-start md:self-auto">{actions}</div> : null}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = active === section.id;

          return (
            <Button key={section.id} asChild size="sm" variant={isActive ? "default" : "outline"} className="w-full sm:w-auto">
              <Link href={section.href}>
                <Icon className="mr-2 h-4 w-4" />
                <span className="truncate">{section.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
