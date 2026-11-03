import { and, eq, isNull, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reports, type UserRole } from "@/lib/db/schema";

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function getOptionalActor(): Promise<Actor | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const role: UserRole =
    session.user.role === "admin" ? "admin" : "operator";

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role,
  };
}

export async function requireUser(): Promise<Actor> {
  const actor = await getOptionalActor();
  if (!actor) {
    throw new HttpError(401, "Sesi tidak ditemukan. Silakan masuk kembali.");
  }
  return actor;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<Actor> {
  const actor = await requireUser();
  if (!allowedRoles.includes(actor.role)) {
    throw new HttpError(
      403,
      "Anda tidak memiliki hak akses untuk tindakan ini.",
    );
  }
  return actor;
}

/**
 * Returns a SQL condition that scopes report queries by ownership:
 * - Admin sees all non-deleted reports.
 * - Operator only sees non-deleted reports created by themselves.
 */
export function buildReportScopeWhere(actor: Actor): SQL {
  const notDeleted = isNull(reports.deletedAt);
  if (actor.role === "admin") {
    return notDeleted;
  }
  return and(notDeleted, eq(reports.createdBy, actor.id))!;
}

/**
 * Ensures the actor can access the specified report.
 * Returns 404 (not 403) when a report belongs to another user so report IDs are not leaked.
 */
export async function assertReportAccess(
  reportId: string,
  actor: Actor,
) {
  const [report] = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, reportId), buildReportScopeWhere(actor)))
    .limit(1);

  if (!report) {
    throw new HttpError(404, "Laporan tidak ditemukan.");
  }

  return report;
}

export function handleApiError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  console.error("[API Error]", error);
  return NextResponse.json(
    { error: "Terjadi kesalahan pada server." },
    { status: 500 },
  );
}

