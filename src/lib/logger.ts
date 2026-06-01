import db from "@/lib/db";

export function logOperation({
  action,
  entityType,
  entityId,
  entityName,
  details,
  operator = "system",
}: {
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: string;
  operator?: string;
}) {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO operation_logs (id, action, entityType, entityId, entityName, details, operator, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, action, entityType, entityId || "", entityName || "", details || "", operator, now);

    return id;
  } catch (error) {
    console.error("Failed to log operation:", error);
    return null;
  }
}
