import type { SupabaseClient } from "@supabase/supabase-js";
import { dsrDateToIso } from "@/lib/iras/dsr/normalize";
import type { IrasDsrProduct, IrasDsrRecord } from "@/lib/iras/dsr/types";
import { fetchAllPages } from "@/lib/supabase/fetch-all";

export interface DsrStoredRecordEntry {
  dsrDate: string;
  product: IrasDsrProduct;
  record: IrasDsrRecord;
}

export interface DsrPeriodFilters {
  dateFrom?: string;
  dateTo?: string;
  product?: IrasDsrProduct;
  months?: string[];
}

function recordInPeriod(isoDate: string, filters: DsrPeriodFilters): boolean {
  if (filters.months?.length) {
    const monthKey = isoDate.slice(0, 7);
    if (!filters.months.includes(monthKey)) return false;
  }
  if (filters.dateFrom && isoDate < filters.dateFrom) return false;
  if (filters.dateTo && isoDate > filters.dateTo) return false;
  return true;
}

export async function getDsrRecordsInPeriod(
  supabase: SupabaseClient,
  filters: DsrPeriodFilters = {}
): Promise<DsrStoredRecordEntry[]> {
  const rows = await fetchAllPages(async (from, to) => {
    let query = supabase
      .from("iras_dsr_records")
      .select("dsr_date, product, record_data")
      .order("dsr_date", { ascending: true })
      .order("product", { ascending: true })
      .range(from, to);

    if (filters.product) {
      query = query.eq("product", filters.product);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });

  return rows
    .map((row) => {
      const product = row.product === "MS" || row.product === "HSD" ? row.product : null;
      if (!product) return null;

      const dsrDate = String(row.dsr_date);
      const isoDate =
        dsrDateToIso(dsrDate) ??
        dsrDateToIso(
          typeof row.record_data?.date_time === "string" ? row.record_data.date_time : ""
        );
      if (!isoDate || !recordInPeriod(isoDate, filters)) return null;

      return {
        dsrDate,
        product,
        record: row.record_data as IrasDsrRecord,
      };
    })
    .filter((entry): entry is DsrStoredRecordEntry => entry != null)
    .sort((left, right) => {
      const leftIso = dsrDateToIso(left.dsrDate) ?? left.dsrDate;
      const rightIso = dsrDateToIso(right.dsrDate) ?? right.dsrDate;
      return leftIso.localeCompare(rightIso) || left.product.localeCompare(right.product);
    });
}
