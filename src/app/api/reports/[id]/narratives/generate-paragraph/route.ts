import { type NextRequest, NextResponse } from "next/server";
import { handleApiError, HttpError, requireUser } from "@/server/permissions";
import { generateParagraphWithAi } from "@/server/services/paragraph-ai-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await context.params;
    const body = await request.json();

    const {
      sectionKey,
      paragraphIndex,
      currentDraft,
      lengthOption,
      additionalInstructions,
    } = body;

    if (!sectionKey || (sectionKey !== "section_a" && sectionKey !== "section_c")) {
      throw new HttpError(400, "sectionKey harus bernilai 'section_a' atau 'section_c'.");
    }

    if (typeof paragraphIndex !== "number" || paragraphIndex < 0) {
      throw new HttpError(400, "paragraphIndex wajib berupa angka non-negatif.");
    }

    const validLengths = ["short", "medium", "detailed"];
    const chosenLength = validLengths.includes(lengthOption)
      ? lengthOption
      : "medium";

    const data = await generateParagraphWithAi(
      id,
      {
        sectionKey,
        paragraphIndex,
        currentDraft: typeof currentDraft === "string" ? currentDraft : "",
        lengthOption: chosenLength,
        additionalInstructions:
          typeof additionalInstructions === "string"
            ? additionalInstructions
            : undefined,
      },
      actor,
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

