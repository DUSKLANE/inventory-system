import { getDb } from "@/lib/db";

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
  // Fire-and-forget: don't await, just call
  getDb().logOperation({ action, entityType, entityId, entityName, details, operator }).catch((e: unknown) => {
    console.error("Failed to log operation:", e);
  });
}
