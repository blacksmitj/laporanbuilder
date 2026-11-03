import { desc, eq, ilike, or } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type {
  CreateUserInput,
  UpdateUserInput,
} from "@/lib/validations/user-schema";
import { type Actor, HttpError } from "@/server/permissions";
import { recordAuditLog } from "./audit-service";

export async function listUsers(search?: string) {
  const query = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    return query.where(
      or(ilike(users.name, term), ilike(users.email, term)),
    );
  }

  return query;
}

export async function createUserByAdmin(
  input: CreateUserInput,
  actor: Actor,
) {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    throw new HttpError(409, "Email sudah terdaftar.");
  }

  const created = await auth.api.createUser({
    headers: await headers(),
    body: {
      name: input.name,
      email: input.email.toLowerCase(),
      password: input.password,
      role: input.role,
    },
  });

  if (!created?.user) {
    throw new HttpError(500, "Gagal membuat pengguna baru.");
  }

  await recordAuditLog({
    userId: actor.id,
    action: "user.created",
    metadata: {
      targetUserId: created.user.id,
      email: created.user.email,
      role: input.role,
    },
  });

  return created.user;
}

export async function updateUserByAdmin(
  targetUserId: string,
  input: UpdateUserInput,
  actor: Actor,
) {
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) {
    throw new HttpError(404, "Pengguna tidak ditemukan.");
  }

  if (targetUserId === actor.id && input.role && input.role !== "admin") {
    throw new HttpError(
      400,
      "Anda tidak dapat menurunkan peran akun Anda sendiri.",
    );
  }

  if (targetUserId === actor.id && input.banned === true) {
    throw new HttpError(
      400,
      "Anda tidak dapat menonaktifkan akun Anda sendiri.",
    );
  }

  const updatePayload: Partial<typeof users.$inferInsert> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.role !== undefined) updatePayload.role = input.role;
  if (input.banned !== undefined) updatePayload.banned = input.banned;

  if (Object.keys(updatePayload).length > 0) {
    await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, targetUserId));
  }

  if (input.password) {
    await auth.api.setUserPassword({
      headers: await headers(),
      body: {
        userId: targetUserId,
        newPassword: input.password,
      },
    });
  }

  await recordAuditLog({
    userId: actor.id,
    action: "user.updated",
    metadata: {
      targetUserId,
      changes: {
        name: input.name,
        role: input.role,
        banned: input.banned,
        passwordReset: Boolean(input.password),
      },
    },
  });

  const [updated] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      banned: users.banned,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  return updated;
}

export async function deleteUserByAdmin(
  targetUserId: string,
  actor: Actor,
) {
  if (targetUserId === actor.id) {
    throw new HttpError(400, "Anda tidak dapat menghapus akun Anda sendiri.");
  }

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, targetUserId))
    .limit(1);

  if (!target) {
    throw new HttpError(404, "Pengguna tidak ditemukan.");
  }

  await db.delete(users).where(eq(users.id, targetUserId));

  await recordAuditLog({
    userId: actor.id,
    action: "user.deleted",
    metadata: {
      targetUserId,
      email: target.email,
    },
  });
}

