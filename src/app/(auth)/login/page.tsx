import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getOptionalActor } from "@/server/permissions";

export default async function LoginPage() {
  const actor = await getOptionalActor();
  if (actor) {
    redirect("/dashboard");
  }

  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Memuat halaman masuk...</div>}>
      <LoginForm />
    </Suspense>
  );
}

