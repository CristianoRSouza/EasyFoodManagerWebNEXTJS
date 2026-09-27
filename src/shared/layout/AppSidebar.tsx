"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Headset, Loader2, LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/shared/ui/primitives/sidebar";
import { cn } from "@/shared/ui/cn";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { useSignOut } from "@/shared/session/use-sign-out";
import { APP_VERSION_LABEL } from "@/shared/version";
import { SUPPORT_GROUP_LABEL, buildNavGroups, isNavItemActive, type NavItem } from "./nav-items";
import { useExternalAccess } from "./external-access";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const handleSignOut = useSignOut();
  const { backend } = useRuntime();
  const { isSystemAdmin, isCompanyAdmin } = useTenant();
  const { openBilling, openAiCredits, openSupport, billingLoading, supportLoading } = useExternalAccess();
  const navGroups = buildNavGroups({ backend, isSystemAdmin, isCompanyAdmin });

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderExternal = (item: NavItem) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        onClick={() => {
          handleNavClick();
          void (item.external === "billing" ? openBilling() : openAiCredits());
        }}
        disabled={billingLoading}
        tooltip={item.title}
        className="hover:bg-sidebar-accent/50 transition-colors"
      >
        {billingLoading ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <item.icon className="mr-2 h-4 w-4 shrink-0" />}
        {!collapsed && (
          <span className="flex flex-1 items-center justify-between">
            <span>{item.title}</span>
            <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
          </span>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderLink = (item: NavItem) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <Link
          href={item.url}
          onClick={handleNavClick}
          className={cn(
            "hover:bg-sidebar-accent/50 transition-colors",
            isNavItemActive(pathname, item.url) && "bg-sidebar-accent text-primary font-medium",
          )}
        >
          <item.icon className="mr-2 h-4 w-4 shrink-0" />
          {!collapsed && <span>{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className={`px-4 py-5 ${collapsed ? "px-2" : ""}`}>
          {!collapsed ? (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
                <span className="text-primary">Easy</span>FoodManager
              </h1>
              <p className="mt-0.5 text-xs text-sidebar-foreground/50">Admin v{APP_VERSION_LABEL}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <span className="text-primary font-bold text-lg">E</span>
            </div>
          )}
        </div>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.label === SUPPORT_GROUP_LABEL && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={openSupport}
                      disabled={supportLoading}
                      tooltip="Falar com o suporte"
                      className="hover:bg-sidebar-accent/50 transition-colors"
                    >
                      {supportLoading ? <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" /> : <Headset className="mr-2 h-4 w-4 shrink-0" />}
                      {!collapsed && (
                        <span className="flex flex-1 items-center justify-between">
                          <span>Falar com o suporte</span>
                          <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-60" />
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {group.items.map((item) => (item.external ? renderExternal(item) : renderLink(item)))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} className="hover:bg-destructive/20 text-destructive transition-colors cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4 shrink-0" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
