import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-muted/40 p-4">
      {children}
    </div>
  );
}

