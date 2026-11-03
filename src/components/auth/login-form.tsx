"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileSpreadsheet, Loader2, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { signIn } from "@/lib/auth/client";

const loginSchema = z.object({
  email: z.string().trim().email("Masukkan alamat email yang valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);
    const result = await signIn.email({
      email: values.email,
      password: values.password,
    });

    if (result.error) {
      const message =
        result.error.message === "Invalid email or password"
          ? "Email atau kata sandi tidak sesuai."
          : result.error.message ?? "Gagal masuk ke aplikasi.";
      setServerError(message);
      toast.add({
        title: "Gagal masuk",
        description: message,
        type: "error",
      });
      return;
    }

    toast.add({
      title: "Berhasil masuk",
      description: "Selamat datang kembali di LaporanBuilder.",
      type: "success",
    });

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <FileSpreadsheet className="size-6" />
        </div>
        <CardTitle className="text-xl font-semibold">
          LaporanBuilder PDF
        </CardTitle>
        <CardDescription>
          Sistem Otomatisasi Laporan Perjalanan Dinas &amp; Monev
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="space-y-4">
          {serverError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {serverError}
            </div>
          )}
          <FieldGroup className="gap-4">
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">Email Instansi</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="nama@kemnaker.go.id"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email && (
                <FieldError>{errors.email.message}</FieldError>
              )}
            </Field>

            <Field data-invalid={Boolean(errors.password)}>
              <FieldLabel htmlFor="password">Kata Sandi</FieldLabel>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password && (
                <FieldError>{errors.password.message}</FieldError>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Memverifikasi...
              </>
            ) : (
              <>
                <LockKeyhole className="mr-2 size-4" />
                Masuk ke Aplikasi
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Hubungi Administrator untuk pembuatan akun atau reset kata sandi.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

