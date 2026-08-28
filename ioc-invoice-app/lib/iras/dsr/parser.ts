import type { IrasDsrCaptureSummary, IrasDsrParsedResponse, IrasDsrRecord } from "@/lib/iras/dsr/types";

function parseDsrDateValue(dateTime: string): number {
  const parts = dateTime.trim().split("-");
  if (parts.length !== 3) return Number.NaN;

  const [day, month, year] = parts.map((part) => Number(part));
  if (!day || !month || !year) return Number.NaN;

  return new Date(year, month - 1, day).getTime();
}

export function sortDsrRecordsByDate(records: IrasDsrRecord[]): IrasDsrRecord[] {
  return [...records].sort(
    (left, right) =>
      parseDsrDateValue(typeof left.date_time === "string" ? left.date_time : "") -
      parseDsrDateValue(typeof right.date_time === "string" ? right.date_time : "")
  );
}

export function summarizeDsrRecords(records: IrasDsrRecord[]): IrasDsrCaptureSummary {
  const dates = records
    .map((record) => record.date_time)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .sort((left, right) => parseDsrDateValue(left) - parseDsrDateValue(right));

  return {
    recordCount: records.length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    totalCount: records.length,
  };
}

export function parseDsrResponse(json: unknown): IrasDsrParsedResponse {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("Response is not a JSON object");
  }

  const payload = json as Record<string, unknown>;

  if (!Array.isArray(payload.data)) {
    throw new Error("Response.data is missing or not an array");
  }

  const data = payload.data as IrasDsrRecord[];
  const totalCount =
    typeof payload.totalCount === "number"
      ? payload.totalCount
      : Number.isFinite(Number(payload.totalCount))
        ? Number(payload.totalCount)
        : data.length;

  return {
    columns: Array.isArray(payload.columns) ? payload.columns : [],
    data,
    totalCount,
  };
}
