import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, reports, users } from "@/lib/db/schema";
import type { Actor } from "@/server/permissions";

export interface RecordAuditLogInput {
  userId?: string | null;
  reportId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog(input: RecordAuditLogInput) {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId ?? null,
      reportId: input.reportId ?? null,
      action: input.action,
      metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
  }
}

export interface AuditLogItem {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  reportId: string | null;
  reportName: string | null;
}

export async function listAuditLogs(
  actor: Actor,
  options?: {
    reportId?: string;
    limit?: number;
  },
): Promise<AuditLogItem[]> {
  const limit = options?.limit ?? 50;

  let query = db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      userId: auditLogs.userId,
      userName: users.name,
      userEmail: users.email,
      reportId: auditLogs.reportId,
      reportName: reports.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .leftJoin(reports, eq(auditLogs.reportId, reports.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  if (options?.reportId) {
    const rows = await query.where(eq(auditLogs.reportId, options.reportId));
    return rows;
  }

  // If operator, only show activities where they were the user or own report
  if (actor.role !== "admin") {
    const rows = await query.where(eq(auditLogs.userId, actor.id));
    return rows;
  }

  const rows = await query;
  return rows;
}

