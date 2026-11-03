import { type NextRequest, NextResponse } from "next/server";
import { createTemplateVersionSchema } from "@/lib/validations/template-schema";
import { handleApiError, HttpError, requireRole } from "@/server/permissions";
import {
  createTemplateVersion,
  deleteTemplateVersion,
  updateTemplateVersion,
} from "@/server/services/template-service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await request.json();
    const parsed = createTemplateVersionSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Konfigurasi template tidak valid.",
      );
    }

    const data = await createTemplateVersion(id, parsed.data, actor);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const body = await request.json();
    const versionNumber = Number(body.version);

    if (!versionNumber || Number.isNaN(versionNumber)) {
      throw new HttpError(400, "Nomor versi wajib disertakan.");
    }

    const parsed = createTemplateVersionSchema.safeParse({
      configuration: body.configuration,
    });

    if (!parsed.success) {
      throw new HttpError(
        400,
        parsed.error.issues[0]?.message ?? "Konfigurasi template tidak valid.",
      );
    }

    const data = await updateTemplateVersion(id, versionNumber, parsed.data, actor);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireRole(["admin"]);
    const { id } = await context.params;
    const url = new URL(request.url);
    const versionParam = url.searchParams.get("version");
    const versionNumber = Number(versionParam);

    if (!versionNumber || Number.isNaN(versionNumber)) {
      throw new HttpError(400, "Parameter query 'version' wajib disertakan.");
    }

    const result = await deleteTemplateVersion(id, versionNumber, actor);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}


