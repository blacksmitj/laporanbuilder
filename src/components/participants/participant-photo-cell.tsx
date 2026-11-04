"use client";

import type { ParticipantListItem } from "@/server/services/participant-service";
import { ParticipantPhotoThumbnail } from "@/components/participants/participant-photo-thumbnail";

interface ParticipantPhotoCellProps {
  participant: ParticipantListItem;
  reportId: string;
  onUploadPhoto: (kind: "business" | "activity") => void;
  onPreviewPhoto: (info: {
    src: string;
    rawSrc?: string | null;
    title: string;
    kind: "business" | "activity";
    participantDetail?: string;
  }) => void;
}

export function ParticipantPhotoCell({
  participant,
  reportId,
  onUploadPhoto,
  onPreviewPhoto,
}: ParticipantPhotoCellProps) {
  const norm = participant.normalizedData ?? {};
  const respondentName = String(norm.respondentName ?? "Peserta");
  const detailParts = [
    norm.nik ? `NIK: ${norm.nik}` : null,
    norm.tkmId ? `ID: ${norm.tkmId}` : null,
    norm.team ? `Team: ${norm.team}` : null,
    norm.interviewRegency ? `Wilayah: ${norm.interviewRegency}` : null,
  ].filter(Boolean);
  const participantDetail = detailParts.join(" • ");

  const businessPhotoSrc = participant.businessPhoto
    ? `/api/reports/${reportId}/participants/${participant.id}/documents/${participant.businessPhoto.documentId}/preview`
    : participant.businessPhotoUrl;

  const activityPhotoSrc = participant.activityPhoto
    ? `/api/reports/${reportId}/participants/${participant.id}/documents/${participant.activityPhoto.documentId}/preview`
    : participant.activityPhotoUrl;

  return (
    <div className="flex flex-col gap-1 min-w-[130px]">
      <div className="flex items-center gap-2">
        <ParticipantPhotoThumbnail
          label="Usaha"
          fullLabel="Tempat Usaha"
          participantName={respondentName}
          rawSrc={businessPhotoSrc}
          onUpload={() => onUploadPhoto("business")}
          onPreview={(src, title, rawSrc) =>
            onPreviewPhoto({
              src,
              rawSrc,
              title,
              kind: "business",
              participantDetail,
            })
          }
        />
        <ParticipantPhotoThumbnail
          label="Kegiatan"
          fullLabel="Kegiatan"
          participantName={respondentName}
          rawSrc={activityPhotoSrc}
          onUpload={() => onUploadPhoto("activity")}
          onPreview={(src, title, rawSrc) =>
            onPreviewPhoto({
              src,
              rawSrc,
              title,
              kind: "activity",
              participantDetail,
            })
          }
        />
      </div>

      {participant.documentCount > 0 && (
        <span className="text-[10px] text-muted-foreground">
          {participant.documentCount} file dokumentasi
        </span>
      )}
    </div>
  );
}

