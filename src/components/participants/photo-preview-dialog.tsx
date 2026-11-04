"use client";

import { ExternalLink, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PhotoPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  participantDetail?: string;
  imageUrl: string | null;
  rawUrl?: string | null;
  onUploadClick?: () => void;
}

export function PhotoPreviewDialog({
  isOpen,
  onClose,
  title,
  participantDetail,
  imageUrl,
  rawUrl,
  onUploadClick,
}: PhotoPreviewDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl overflow-hidden p-0 gap-0">
        <DialogHeader className="p-4 sm:p-5 border-b">
          <DialogTitle className="text-base sm:text-lg font-semibold">{title}</DialogTitle>
          {participantDetail && (
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {participantDetail}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="relative flex max-h-[70vh] min-h-60 w-full items-center justify-center bg-black/95 p-2 sm:p-4">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="max-h-[65vh] max-w-full rounded object-contain shadow-2xl"
            />
          ) : (
            <div className="text-xs text-muted-foreground">Gambar tidak tersedia</div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between border-t bg-background/50 p-3 sm:px-5">
          <div className="flex items-center gap-2">
            {onUploadClick && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onUploadClick();
                }}
              >
                <Upload className="mr-1.5 size-3.5" />
                Ganti Foto
              </Button>
            )}

            {rawUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={rawUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                Buka Tautan Asli
              </Button>
            )}
          </div>

          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

