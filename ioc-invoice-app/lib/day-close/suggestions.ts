function descriptionsFromRows(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((row) => {
      const item = row as Record<string, unknown>;
      return item.description != null ? String(item.description).trim() : "";
    })
    .filter(Boolean);
}

function uniqueSortedNames(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "en-IN"));
}

export interface DayCloseDescribedSuggestions {
  credits: string[];
  expenses: string[];
}

export function extractDescribedSuggestions(
  rows: Array<{
    ms_credit_rows?: unknown;
    hsd_credit_rows?: unknown;
    ms_expense_rows?: unknown;
    hsd_expense_rows?: unknown;
  }>
): DayCloseDescribedSuggestions {
  const credits: string[] = [];
  const expenses: string[] = [];

  for (const row of rows) {
    credits.push(
      ...descriptionsFromRows(row.ms_credit_rows),
      ...descriptionsFromRows(row.hsd_credit_rows)
    );
    expenses.push(
      ...descriptionsFromRows(row.ms_expense_rows),
      ...descriptionsFromRows(row.hsd_expense_rows)
    );
  }

  return {
    credits: uniqueSortedNames(credits),
    expenses: uniqueSortedNames(expenses),
  };
}
