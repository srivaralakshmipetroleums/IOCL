import type { SupabaseClient } from "@supabase/supabase-js";
import { parseDsrResponse, sortDsrRecordsByDate, summarizeDsrRecords } from "@/lib/iras/dsr/parser";
import type {
  IrasDsrCaptureJobMeta,
  IrasDsrProduct,
  IrasDsrRecord,
  IrasDsrStoredCapture,
  IrasDsrStoredData,
  IrasDsrStoredRecordEntry,
} from "@/lib/iras/dsr/types";

export interface PersistDsrCaptureResult {
  captureId: string;
  recordsInserted: number;
  recordsSkipped: number;
}

export interface GetStoredDsrDataOptions {
  month?: number;
  year?: number;
  product?: IrasDsrProduct;
}

function sortStoredRecords(records: IrasDsrStoredRecordEntry[]): IrasDsrStoredRecordEntry[] {
  return [...records].sort((left, right) => {
    const leftDate = typeof left.record.date_time === "string" ? left.record.date_time : "";
    const rightDate = typeof right.record.date_time === "string" ? right.record.date_time : "";
    return leftDate.localeCompare(rightDate);
  });
}

export function buildDsrRecordRows(
  captureId: string,
  product: IrasDsrProduct | null,
  records: IrasDsrRecord[]
): Array<{ capture_id: string; dsr_date: string; product: IrasDsrProduct | null; record_data: IrasDsrRecord }> {
  const rows = records
    .filter((record) => typeof record.date_time === "string" && record.date_time.trim().length > 0)
    .map((record) => ({
      capture_id: captureId,
      dsr_date: String(record.date_time),
      product,
      record_data: record,
    }));

  const deduped = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    deduped.set(`${row.dsr_date}::${row.product ?? ""}`, row);
  }

  return [...deduped.values()];
}

function throwRepositoryError(error: unknown, action: string): never {
  throw new Error(`${action}: ${toRepositoryErrorMessage(error)}`);
}

function toRepositoryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0
    );
    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }

  return "Unknown database error";
}

export async function persistDsrCapture(
  supabase: SupabaseClient,
  rawResponse: unknown,
  meta?: IrasDsrCaptureJobMeta
): Promise<PersistDsrCaptureResult> {
  const parsed = parseDsrResponse(rawResponse);
  const summary = summarizeDsrRecords(parsed.data);

  const { data: capture, error: captureError } = await supabase
    .from("iras_dsr_captures")
    .insert({
      raw_response: rawResponse,
      columns: parsed.columns,
      total_count: parsed.totalCount,
      first_dsr_date: summary.firstDate,
      last_dsr_date: summary.lastDate,
      record_count: parsed.data.length,
      product: meta?.product ?? null,
      report_month: meta?.month ?? null,
      report_year: meta?.year ?? null,
    })
    .select("id")
    .single();

  if (captureError) throwRepositoryError(captureError, "Failed to store DSR capture");

  const recordRows = buildDsrRecordRows(String(capture.id), meta?.product ?? null, parsed.data);
  if (recordRows.length === 0) {
    return {
      captureId: String(capture.id),
      recordsInserted: 0,
      recordsSkipped: 0,
    };
  }

  const { data: insertedRows, error: recordsError } = await supabase
    .from("iras_dsr_records")
    .upsert(recordRows, { onConflict: "dsr_date,product" })
    .select("id");

  if (recordsError) throwRepositoryError(recordsError, "Failed to store DSR records");

  return {
    captureId: String(capture.id),
    recordsInserted: insertedRows?.length ?? 0,
    recordsSkipped: Math.max(recordRows.length - (insertedRows?.length ?? 0), 0),
  };
}

function mapStoredCapture(row: Record<string, unknown>): IrasDsrStoredCapture {
  return {
    id: String(row.id),
    capturedAt: String(row.captured_at),
    totalCount: row.total_count != null ? Number(row.total_count) : null,
    firstDsrDate: row.first_dsr_date != null ? String(row.first_dsr_date) : null,
    lastDsrDate: row.last_dsr_date != null ? String(row.last_dsr_date) : null,
    recordCount: Number(row.record_count ?? 0),
    columns: Array.isArray(row.columns) ? row.columns : [],
    rawResponse: row.raw_response,
    product: row.product === "MS" || row.product === "HSD" ? row.product : null,
    reportMonth: row.report_month != null ? Number(row.report_month) : null,
    reportYear: row.report_year != null ? Number(row.report_year) : null,
  };
}

function summarizeStoredRecords(records: IrasDsrStoredRecordEntry[]) {
  const parsedRecords = sortDsrRecordsByDate(records.map((entry) => entry.record));
  return summarizeDsrRecords(parsedRecords);
}

export async function getStoredDsrData(
  supabase: SupabaseClient,
  options: GetStoredDsrDataOptions = {}
): Promise<IrasDsrStoredData> {
  let captureQuery = supabase.from("iras_dsr_captures").select("*").order("captured_at", {
    ascending: false,
  });

  if (options.year != null) {
    captureQuery = captureQuery.eq("report_year", options.year);
  }
  if (options.month != null) {
    captureQuery = captureQuery.eq("report_month", options.month);
  }
  if (options.product != null) {
    captureQuery = captureQuery.eq("product", options.product);
  }

  const { data: captureRow, error: captureError } = await captureQuery.limit(1).maybeSingle();
  if (captureError) throwRepositoryError(captureError, "Failed to store DSR capture");

  let recordsQuery = supabase.from("iras_dsr_records").select("dsr_date, product, record_data");

  if (options.product != null) {
    recordsQuery = recordsQuery.eq("product", options.product);
  }

  const { data: recordRows, error: recordsError } = await recordsQuery.order("dsr_date", {
    ascending: true,
  });

  if (recordsError) throwRepositoryError(recordsError, "Failed to store DSR records");

  const records = sortStoredRecords(
    (recordRows ?? []).map((row) => ({
      product: row.product === "MS" || row.product === "HSD" ? row.product : null,
      record: row.record_data as IrasDsrRecord,
    }))
  );

  const filteredRecords =
    options.month != null && options.year != null
      ? records.filter((entry) => {
          const dateTime = entry.record.date_time;
          if (typeof dateTime !== "string") return false;
          const match = dateTime.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (!match) return false;
          return Number(match[2]) === options.month && Number(match[3]) === options.year;
        })
      : records;

  const latestCapture = captureRow ? mapStoredCapture(captureRow) : null;
  const summary =
    filteredRecords.length > 0
      ? summarizeStoredRecords(filteredRecords)
      : latestCapture
        ? {
            recordCount: latestCapture.recordCount,
            firstDate: latestCapture.firstDsrDate,
            lastDate: latestCapture.lastDsrDate,
            totalCount: latestCapture.totalCount ?? latestCapture.recordCount,
          }
        : null;

  return {
    latestCapture,
    records: filteredRecords,
    summary,
  };
}
