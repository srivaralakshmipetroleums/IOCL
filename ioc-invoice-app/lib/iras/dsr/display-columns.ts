import type { IrasDsrRecord } from "@/lib/iras/dsr/types";

function columnKeyFromStoredValue(column: unknown): string | null {
  if (typeof column === "string" && column.trim().length > 0) {
    return column;
  }

  if (column && typeof column === "object" && !Array.isArray(column)) {
    const field = (column as Record<string, unknown>).field;
    if (typeof field === "string" && field.trim().length > 0) {
      return field;
    }
  }

  return null;
}

export function resolveDsrTableColumns(
  columns: unknown[] | null | undefined,
  records: IrasDsrRecord[]
): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const column of columns ?? []) {
    const key = columnKeyFromStoredValue(column);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(key);
    }
  }

  return ordered;
}
