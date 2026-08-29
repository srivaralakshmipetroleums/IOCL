import { readFileSync } from "fs";
import path from "path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { dsrDateToIso } from "@/lib/iras/dsr/normalize";
import type { DsrStoredRecordEntry } from "@/lib/iras/dsr/query-helpers";
import type { IrasDsrProduct, IrasDsrRecord } from "@/lib/iras/dsr/types";
import {
  applyTotalizerFromMetersToRecord,
  listTotalizerBackfillCandidates,
} from "@/lib/iras/dsr/totalizer-from-meters";
import { fetchAllPages } from "@/lib/supabase/fetch-all";

const DEFAULT_DATE_FROM = "2021-01-01";
const DEFAULT_DATE_TO_EXCLUSIVE = "2022-04-01";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let dateFrom = DEFAULT_DATE_FROM;
  let dateToExclusive = DEFAULT_DATE_TO_EXCLUSIVE;
  let apply = false;

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--apply") {
      apply = true;
      continue;
    }
    if (arg === "--from" && args[index + 1]) {
      dateFrom = args[++index];
      continue;
    }
    if (arg === "--to" && args[index + 1]) {
      dateToExclusive = args[++index];
      continue;
    }
  }

  return { dateFrom, dateToExclusive, apply };
}

function entryIsoDate(entry: DsrStoredRecordEntry): string | null {
  return (
    dsrDateToIso(entry.dsrDate) ??
    (typeof entry.record.date_time === "string" ? dsrDateToIso(entry.record.date_time) : null)
  );
}

type DsrRecordRow = {
  id: string;
  dsr_date: string;
  product: string | null;
  record_data: unknown;
};

async function loadAllDsrRecords(
  supabase: SupabaseClient
): Promise<Array<DsrStoredRecordEntry & { id: string }>> {
  const rows = await fetchAllPages<DsrRecordRow>(async (from, to) => {
    const { data, error } = await supabase
      .from("iras_dsr_records")
      .select("id, dsr_date, product, record_data")
      .order("dsr_date", { ascending: true })
      .order("product", { ascending: true })
      .range(from, to);

    if (error) throw error;
    return data ?? [];
  });

  return rows
    .map((row) => {
      const product = row.product === "MS" || row.product === "HSD" ? row.product : null;
      if (!product) return null;

      return {
        id: String(row.id),
        dsrDate: String(row.dsr_date),
        product,
        record: row.record_data as IrasDsrRecord,
      };
    })
    .filter((entry): entry is DsrStoredRecordEntry & { id: string } => entry != null);
}

async function main() {
  loadEnv();
  const { dateFrom, dateToExclusive, apply } = parseArgs();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const allEntries = await loadAllDsrRecords(supabase);
  const candidates = listTotalizerBackfillCandidates(allEntries).filter(
    (row) => row.isoDate >= dateFrom && row.isoDate < dateToExclusive
  );

  if (candidates.length === 0) {
    console.log(`No missing netTotalizerSales rows to backfill for ${dateFrom} to ${dateToExclusive}.`);
    return;
  }

  console.log(
    `${apply ? "Applying" : "Dry run:"} ${candidates.length} DSR rows in ${dateFrom} .. ${dateToExclusive}`
  );

  const previousByProduct = new Map<IrasDsrProduct, IrasDsrRecord>();
  const entriesByKey = new Map<string, DsrStoredRecordEntry & { id: string }>(
    allEntries.map((entry) => [`${entry.dsrDate}::${entry.product}`, entry])
  );

  for (const entry of [...allEntries].sort((left, right) => {
    const leftIso = entryIsoDate(left) ?? "";
    const rightIso = entryIsoDate(right) ?? "";
    return leftIso.localeCompare(rightIso) || left.product.localeCompare(right.product);
  })) {
    const previous = previousByProduct.get(entry.product) ?? null;
    const updatedRecord = applyTotalizerFromMetersToRecord(entry.record, entry.product, previous);
    previousByProduct.set(entry.product, updatedRecord);

    const key = `${entry.dsrDate}::${entry.product}`;
    if (updatedRecord !== entry.record) {
      entriesByKey.set(key, { ...entry, record: updatedRecord });
    }
  }

  let updated = 0;
  for (const candidate of candidates) {
    const entry = entriesByKey.get(`${candidate.dsrDate}::${candidate.product}`);
    if (!entry) continue;

    console.log(
      `  ${candidate.isoDate} ${candidate.product}: ${candidate.computedLitres} L ` +
        `(meters since ${candidate.previousDsrDate})`
    );

    if (!apply) continue;

    const { error } = await supabase
      .from("iras_dsr_records")
      .update({ record_data: entry.record })
      .eq("id", entry.id);

    if (error) {
      throw new Error(`Failed to update ${candidate.dsrDate} ${candidate.product}: ${error.message}`);
    }
    updated += 1;
  }

  if (apply) {
    console.log(`Updated ${updated} rows. Receipt reconciliation uses existing receiptAsAutomation values.`);
  } else {
    console.log("Re-run with --apply to persist netTotalizerSales into iras_dsr_records.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
