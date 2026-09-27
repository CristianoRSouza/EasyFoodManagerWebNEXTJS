import {
  ArrowLeftRight, BookOpen, Building2, ClipboardList, CreditCard, FileText, KeyRound, LayoutDashboard,
  Monitor, Package, QrCode, Receipt, RefreshCw, Ruler, ScrollText, Server, Sparkles, TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Abre o EasyBilling numa aba nova em vez de navegar. */
  external?: "billing" | "ai-credits";
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const SUPPORT_GROUP_LABEL = "Falar com o suporte";
const INFRA_GROUP_LABEL = "Infra / Serviços";

const BASE_GROUPS: NavGroup[] = [
  { label: "Visão Geral", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Receitas", url: "/receitas", icon: TrendingUp },
  ] },
  { label: "Operação", items: [
    { title: "Comandas", url: "/orders", icon: ClipboardList },
    { title: "Transações", url: "/transactions", icon: CreditCard },
    { title: "NFC-e", url: "/nfce", icon: FileText },
  ] },
  { label: "Cadastros", items: [
    { title: "Produtos", url: "/products", icon: Package },
    { title: "Unidades", url: "/units", icon: Ruler },
    { title: "Emitente NFC-e", url: "/nfce-issuer", icon: Building2 },
  ] },
  { label: INFRA_GROUP_LABEL, items: [
    { title: "Sincronização", url: "/sync", icon: RefreshCw },
    { title: "Totens", url: "/totems", icon: Monitor },
    { title: "PIXnoPDV", url: "/pixnopdv", icon: QrCode },
    { title: "Agentes de Serviço", url: "/agents", icon: Server },
    { title: "Planos", url: "/billing", icon: Receipt, external: "billing" },
    { title: "Créditos IA", url: "/ai-credits", icon: Sparkles, external: "ai-credits" },
  ] },
  { label: SUPPORT_GROUP_LABEL, items: [{ title: "Manual", url: "/manual", icon: BookOpen }] },
];

export function buildNavGroups(input: { backend: "cloud" | "lan"; isSystemAdmin: boolean; isCompanyAdmin: boolean }): NavGroup[] {
  const cloud = input.backend === "cloud";
  const extras: Record<string, NavItem[]> = {
    [INFRA_GROUP_LABEL]: [
      ...(cloud ? [] : [{ title: "Espelho FB↔PG", url: "/sync/espelho", icon: ArrowLeftRight }]),
      ...(cloud && (input.isSystemAdmin || input.isCompanyAdmin)
        ? [{ title: "Códigos de primeiro acesso", url: "/bootstrap-codes", icon: KeyRound }]
        : []),
    ],
    [SUPPORT_GROUP_LABEL]: cloud && input.isSystemAdmin ? [{ title: "Logs de Auditoria", url: "/audit-logs", icon: ScrollText }] : [],
  };
  return BASE_GROUPS.map((group) => ({ ...group, items: [...group.items, ...(extras[group.label] ?? [])] }));
}

export function isNavItemActive(pathname: string, url: string): boolean {
  if (url === "/") return pathname === "/";
  return pathname === url || pathname.startsWith(`${url}/`);
}
