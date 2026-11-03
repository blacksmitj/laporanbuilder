import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { officials } from "@/lib/db/schema";
import type {
  CreateOfficialInput,
  UpdateOfficialInput,
} from "@/lib/validations/official-schema";
import { type Actor, HttpError } from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export async function listOfficials(options?: {
  search?: string;
  onlyActive?: boolean;
}) {
  const rows = await db
    .select()
    .from(officials)
    .orderBy(desc(officials.isActive), officials.name);

  return rows.filter((row) => {
    if (options?.onlyActive && !row.isActive) return false;
    if (options?.search && options.search.trim().length > 0) {
      const term = options.search.trim().toLowerCase();
      return (
        row.name.toLowerCase().includes(term) ||
        row.nip.toLowerCase().includes(term) ||
        row.position.toLowerCase().includes(term) ||
        row.institution.toLowerCase().includes(term)
      );
    }
    return true;
  });
}

export async function createOfficial(input: CreateOfficialInput, actor: Actor) {
  const [created] = await db
    .insert(officials)
    .values({
      name: input.name,
      nip: input.nip,
      position: input.position,
      institution: input.institution,
      isActive: input.isActive ?? true,
    })
    .returning();

  await recordAuditLog({
    userId: actor.id,
    action: "official.created",
    metadata: {
      officialId: created.id,
      name: created.name,
      nip: created.nip,
    },
  });

  return created;
}

export async function updateOfficial(
  officialId: string,
  input: UpdateOfficialInput,
  actor: Actor,
) {
  const [existing] = await db
    .select()
    .from(officials)
    .where(eq(officials.id, officialId))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "Data petugas tidak ditemukan.");
  }

  const [updated] = await db
    .update(officials)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.nip !== undefined ? { nip: input.nip } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.institution !== undefined
        ? { institution: input.institution }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(officials.id, officialId))
    .returning();

  await recordAuditLog({
    userId: actor.id,
    action: "official.updated",
    metadata: {
      officialId,
      changes: input,
    },
  });

  return updated;
}

export async function deleteOfficial(officialId: string, actor: Actor) {
  const [existing] = await db
    .select()
    .from(officials)
    .where(eq(officials.id, officialId))
    .limit(1);

  if (!existing) {
    throw new HttpError(404, "Data petugas tidak ditemukan.");
  }

  try {
    await db.delete(officials).where(eq(officials.id, officialId));
  } catch {
    throw new HttpError(
      400,
      "Petugas tidak dapat dihapus karena sudah terhubung pada laporan. Nonaktifkan petugas sebagai gantinya.",
    );
  }

  await recordAuditLog({
    userId: actor.id,
    action: "official.deleted",
    metadata: {
      officialId,
      name: existing.name,
    },
  });
}

