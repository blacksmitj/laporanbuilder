"use client";

import { useMutation } from "@tanstack/react-query";
import { Copy, Edit, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

interface TemplateListActionsProps {
  templateId: string;
}

export function TemplateListActions({ templateId }: TemplateListActionsProps) {
  const router = useRouter();

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/templates/${templateId}/duplicate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menduplikat template.");
      return json.data as { id: string };
    },
    onSuccess: (newTpl) => {
      toast.add({
        title: "Template Diduplikasi",
        description: "Item template baru berhasil dibuat dari salinan ini.",
        type: "success",
      });
      router.push(`/templates/${newTpl.id}`);
      router.refresh();
    },
    onError: (err: Error) => {
      toast.add({
        title: "Gagal menduplikat template",
        description: err.message,
        type: "error",
      });
    },
  });

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        size="xs"
        variant="outline"
        disabled={duplicateMutation.isPending}
        onClick={() => duplicateMutation.mutate()}
        title="Duplikat sebagai template baru"
      >
        {duplicateMutation.isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Copy className="size-3 text-muted-foreground" />
        )}
        <span className="hidden sm:inline ml-1">Duplikat</span>
      </Button>

      <Button
        size="xs"
        variant="default"
        nativeButton={false}
        render={<Link href={`/templates/${templateId}`} />}
      >
        <Edit className="size-3 mr-1" />
        Edit Template
      </Button>
    </div>
  );
}

