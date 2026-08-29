import { nozzleNetLitres } from "@/lib/day-close/calculate";
import { dsrDateToIso, parseDsrNumber } from "@/lib/iras/dsr/normalize";
import type { DsrStoredRecordEntry } from "@/lib/iras/dsr/query-helpers";
import type { IrasDsrProduct, IrasDsrRecord } from "@/lib/iras/dsr/types";

const TOTALIZER_SALES_KEYS = ["netTotalizerSales", "nettotalizersales", "net_totalizer_sales"] as const;
const TESTING_KEYS = ["testing", "testingLitres", "testing_litres"] as const;

/** Default testing litres deducted per product per day when IRAS shows zero or blank. */
export const DEFAULT_DSR_TESTING_LITRES_PER_DAY = 10;

/** Upper bound for a single product's daily totalizer litres (guards month-open meter baselines). */
const MAX_DAILY_TOTALIZER_LITRES: Record<IrasDsrProduct, number> = {
  MS: 4000,
  HSD: 6000,
};

export interface NozzleMeterReading {
  n1: number | null;
  n2: number | null;
}

function nozzleKeys(product: IrasDsrProduct): [string, string] {
  return product === "MS"
    ? ["nozzle_tank_t2_1", "nozzle_tank_t2_2"]
    : ["nozzle_tank_t2_3", "nozzle_tank_t2_4"];
}

function roundLitres(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function firstNumericField(record: IrasDsrRecord, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = parseDsrNumber(record[key]);
    if (value != null) return value;
  }
  return null;
}

export function extractNozzleMeters(
  record: IrasDsrRecord,
  product: IrasDsrProduct
): NozzleMeterReading {
  const [n1Key, n2Key] = nozzleKeys(product);
  return {
    n1: parseDsrNumber(record[n1Key]),
    n2: parseDsrNumber(record[n2Key]),
  };
}

export function hasStoredTotalizerSales(record: IrasDsrRecord): boolean {
  const stored = firstNumericField(record, TOTALIZER_SALES_KEYS);
  return stored != null && stored > 0;
}

/** True when IRAS left totalizer blank or as zero but meters may still allow backfill. */
export function needsTotalizerBackfill(record: IrasDsrRecord): boolean {
  const stored = firstNumericField(record, TOTALIZER_SALES_KEYS);
  return stored == null || stored === 0;
}

function hasMeterBaseline(previous: NozzleMeterReading): boolean {
  const values = [previous.n1, previous.n2].filter((value): value is number => value != null);
  return values.some((value) => value > 0);
}

export function isPlausibleDailyTotalizer(litres: number, product: IrasDsrProduct): boolean {
  return litres > 0 && litres <= MAX_DAILY_TOTALIZER_LITRES[product];
}

/** Testing litres to deduct — uses stored value when > 0, otherwise 10 L per product per day. */
export function resolveTestingLitres(record: IrasDsrRecord): number {
  const stored = firstNumericField(record, TESTING_KEYS);
  if (stored != null && stored > 0) return stored;
  return DEFAULT_DSR_TESTING_LITRES_PER_DAY;
}

export function needsTestingBackfill(record: IrasDsrRecord): boolean {
  const stored = firstNumericField(record, TESTING_KEYS);
  return stored == null || stored === 0;
}

function meterDelta(previous: number, current: number): number | null {
  const delta = nozzleNetLitres(previous, current);
  if (delta < 0) return null;
  return delta;
}

/** Net totalizer litres from cumulative nozzle meters vs the previous day. */
export function computeNetTotalizerFromMeterDelta(
  current: NozzleMeterReading,
  previous: NozzleMeterReading,
  testingLitres: number,
  product: IrasDsrProduct
): number | null {
  if (!hasMeterBaseline(previous)) return null;

  let total = 0;
  let hasAny = false;

  if (current.n1 != null && previous.n1 != null) {
    const delta = meterDelta(previous.n1, current.n1);
    if (delta == null) return null;
    total += delta;
    hasAny = true;
  }

  if (current.n2 != null && previous.n2 != null) {
    const delta = meterDelta(previous.n2, current.n2);
    if (delta == null) return null;
    total += delta;
    hasAny = true;
  }

  if (!hasAny) return null;

  const testing = Math.max(0, testingLitres);
  const net = roundLitres(total - testing);
  return isPlausibleDailyTotalizer(net, product) ? net : null;
}

export function applyTotalizerFromMetersToRecord(
  record: IrasDsrRecord,
  product: IrasDsrProduct,
  previousRecord: IrasDsrRecord | null
): IrasDsrRecord {
  if (!needsTotalizerBackfill(record) || !previousRecord) {
    return record;
  }

  const computed = computeNetTotalizerFromMeterDelta(
    extractNozzleMeters(record, product),
    extractNozzleMeters(previousRecord, product),
    resolveTestingLitres(record),
    product
  );

  if (computed == null) return record;

  const updated: IrasDsrRecord = {
    ...record,
    netTotalizerSales: computed,
  };

  if (needsTestingBackfill(record)) {
    updated.testing = DEFAULT_DSR_TESTING_LITRES_PER_DAY;
  }

  return updated;
}

function entryIsoDate(entry: DsrStoredRecordEntry): string | null {
  return (
    dsrDateToIso(entry.dsrDate) ??
    (typeof entry.record.date_time === "string" ? dsrDateToIso(entry.record.date_time) : null)
  );
}

function sortEntriesChronologically(entries: DsrStoredRecordEntry[]): DsrStoredRecordEntry[] {
  return [...entries].sort((left, right) => {
    const leftIso = entryIsoDate(left) ?? "";
    const rightIso = entryIsoDate(right) ?? "";
    return leftIso.localeCompare(rightIso) || left.product.localeCompare(right.product);
  });
}

/**
 * Fills missing `netTotalizerSales` from day-over-day nozzle meter deltas.
 * Requires prior-day rows per product in `entries` (use lookback rows before the period).
 */
export function enrichDsrStoredEntriesWithTotalizerFromMeters(
  entries: DsrStoredRecordEntry[]
): DsrStoredRecordEntry[] {
  const sorted = sortEntriesChronologically(entries);
  const previousByProduct = new Map<IrasDsrProduct, IrasDsrRecord>();
  const enriched: DsrStoredRecordEntry[] = [];

  for (const entry of sorted) {
    const previous = previousByProduct.get(entry.product) ?? null;
    const record = applyTotalizerFromMetersToRecord(entry.record, entry.product, previous);
    enriched.push({ ...entry, record });
    previousByProduct.set(entry.product, record);
  }

  return enriched;
}

export interface TotalizerBackfillCandidate {
  dsrDate: string;
  product: IrasDsrProduct;
  isoDate: string;
  computedLitres: number;
  previousDsrDate: string;
}

export function listTotalizerBackfillCandidates(
  entries: DsrStoredRecordEntry[]
): TotalizerBackfillCandidate[] {
  const sorted = sortEntriesChronologically(entries);
  const previousByProduct = new Map<
    IrasDsrProduct,
    { record: IrasDsrRecord; dsrDate: string; isoDate: string }
  >();
  const candidates: TotalizerBackfillCandidate[] = [];

  for (const entry of sorted) {
    const isoDate = entryIsoDate(entry);
    if (!isoDate) continue;

    const previous = previousByProduct.get(entry.product);
    if (needsTotalizerBackfill(entry.record) && previous) {
      const computed = computeNetTotalizerFromMeterDelta(
        extractNozzleMeters(entry.record, entry.product),
        extractNozzleMeters(previous.record, entry.product),
        resolveTestingLitres(entry.record),
        entry.product
      );

      if (computed != null) {
        candidates.push({
          dsrDate: entry.dsrDate,
          product: entry.product,
          isoDate,
          computedLitres: computed,
          previousDsrDate: previous.dsrDate,
        });
      }
    }

    previousByProduct.set(entry.product, {
      record: entry.record,
      dsrDate: entry.dsrDate,
      isoDate,
    });
  }

  return candidates;
}
