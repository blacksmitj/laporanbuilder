"use client";

import {
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { toast } from "@/components/ui/toast";
import { signOut } from "@/lib/auth/client";
import type { Actor } from "@/server/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  {
    label: "Dasbor",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Daftar Laporan",
    href: "/reports",
    icon: FileText,
  },
  {
    label: "Buat Laporan Baru",
    href: "/reports/new",
    icon: PlusCircle,
  },
];

const adminNavItems: NavItem[] = [
  {
    label: "Konfigurasi Template",
    href: "/templates",
    icon: SlidersHorizontal,
    adminOnly: true,
  },
  {
    label: "Manajemen Pengguna",
    href: "/users",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: Settings,
    adminOnly: true,
  },
];

export function AppSidebar({ actor }: { actor: Actor }) {
  const pathname = usePathname();
  const router = useRouter();

  const initials = actor.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    await signOut();
    toast.add({
      title: "Sesi berakhir",
      description: "Anda telah keluar dari aplikasi.",
      type: "info",
    });
    router.push("/login");
    router.refresh();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="size-4" />
          </div>
          <div className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold leading-tight">
              LaporanBuilder
            </span>
            <span className="truncate text-xs text-muted-foreground">
              Generator Laporan PDF
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive =
                  item.href === "/reports"
                    ? pathname === "/reports" ||
                      (pathname.startsWith("/reports/") &&
                        !pathname.startsWith("/reports/new"))
                    : pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {actor.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        render={<Link href={item.href} />}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs font-medium">
                {initials || "US"}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-medium">
                  {actor.name}
                </span>
                <Badge
                  variant={actor.role === "admin" ? "default" : "secondary"}
                  className="h-4 px-1.5 text-[10px]"
                >
                  {actor.role === "admin" ? (
                    <span className="inline-flex items-center gap-0.5">
                      <ShieldCheck className="size-2.5" />
                      Admin
                    </span>
                  ) : (
                    "Operator"
                  )}
                </Badge>
              </div>
              <span className="truncate text-[11px] text-muted-foreground">
                {actor.email}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Keluar dari aplikasi"
            onClick={handleSignOut}
            className="shrink-0 group-data-[collapsible=icon]:hidden"
          >
            <LogOut className="size-4" />
            <span className="sr-only">Keluar</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

