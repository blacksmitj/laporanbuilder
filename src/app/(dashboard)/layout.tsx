import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getOptionalActor } from "@/server/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await getOptionalActor();

  if (!actor) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <AppSidebar actor={actor} />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium text-muted-foreground">
              Sistem Pembuat Laporan Perjalanan Dinas &amp; Monev PDF
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Masuk sebagai{" "}
            <span className="font-medium text-foreground">{actor.name}</span> (
            {actor.role === "admin" ? "Administrator" : "Operator"})
          </div>
        </header>
        <div className="flex flex-1 flex-col p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

