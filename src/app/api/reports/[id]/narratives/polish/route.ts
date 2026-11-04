import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import {
  polishNarrativeUnified,
  type PolishLengthOption,
  type PolishMode,
  type PolishTargetType,
} from "@/server/services/polish-narrative-service";

const VALID_TARGETS: PolishTargetType[] = [
  "section_a",
  "section_b_intro",
  "participant",
  "section_c",
  "closing",
];

const VALID_MODES: PolishMode[] = ["fix", "enhance"];
const VALID_LENGTHS: PolishLengthOption[] = ["short", "medium", "detailed"];

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();

    const {
      targetType,
      participantId,
      paragraphIndex,
      currentDraft,
      mode = "fix",
      lengthOption = "medium",
      additionalInstructions,
    } = body;

    if (!targetType || !VALID_TARGETS.includes(targetType)) {
      throw new HttpError(
        400,
        `targetType tidak valid. Pilihan: ${VALID_TARGETS.join(", ")}`,
      );
    }

    if (targetType === "participant" && !participantId) {
      throw new HttpError(400, "participantId wajib diisi untuk target participant.");
    }

    const chosenMode: PolishMode = VALID_MODES.includes(mode) ? mode : "fix";
    const chosenLength: PolishLengthOption = VALID_LENGTHS.includes(lengthOption)
      ? lengthOption
      : "medium";

    const result = await polishNarrativeUnified(
      id,
      {
        targetType,
        participantId: typeof participantId === "string" ? participantId : undefined,
        paragraphIndex:
          typeof paragraphIndex === "number" ? paragraphIndex : undefined,
        currentDraft: typeof currentDraft === "string" ? currentDraft : "",
        mode: chosenMode,
        lengthOption: chosenLength,
        additionalInstructions:
          typeof additionalInstructions === "string"
            ? additionalInstructions
            : undefined,
      },
      actor,
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    return handleApiError(error);
  }
}

