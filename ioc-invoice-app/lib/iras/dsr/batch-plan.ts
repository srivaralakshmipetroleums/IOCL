export type IrasDsrProduct = "MS" | "HSD";

export interface IrasDsrBatchJob {
  year: number;
  month: number;
  product: IrasDsrProduct;
  label: string;
}

export interface IrasDsrBatchPlan {
  year: number;
  startMonth: number;
  endMonth: number;
  products: IrasDsrProduct[];
  jobs: IrasDsrBatchJob[];
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DSR_MONTH_OPTIONS = MONTH_FULL.map((label, index) => ({
  value: index + 1,
  label,
  shortLabel: MONTH_SHORT[index] ?? String(index + 1),
}));

export const DSR_PRODUCT_OPTIONS: Array<{ value: IrasDsrProduct; label: string }> = [
  { value: "MS", label: "MS (Motor Spirit)" },
  { value: "HSD", label: "HSD (High Speed Diesel / HS in IRAS)" },
];

export function buildSingleJob(options: {
  year: number;
  month: number;
  product: IrasDsrProduct;
}): IrasDsrBatchJob {
  const monthShort = MONTH_SHORT[options.month - 1] ?? String(options.month);
  return {
    year: options.year,
    month: options.month,
    product: options.product,
    label: `${monthShort} ${options.year} ${options.product}`,
  };
}

export function buildSingleJobPlan(job: IrasDsrBatchJob): IrasDsrBatchPlan {
  return {
    year: job.year,
    startMonth: job.month,
    endMonth: job.month,
    products: [job.product],
    jobs: [job],
  };
}

export function parseCaptureJobRequest(input: {
  month?: unknown;
  year?: unknown;
  product?: unknown;
}): IrasDsrBatchJob | null {
  const month = Number(input.month);
  const year = Number(input.year);
  const product = input.product;

  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (product !== "MS" && product !== "HSD") return null;

  return buildSingleJob({ month, year, product });
}

export function dsrRecordMatchesMonthYear(
  record: Record<string, string | number | null | undefined>,
  month: number,
  year: number
): boolean {
  const dateTime = record.date_time;
  if (typeof dateTime !== "string") return false;

  const match = dateTime.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return false;

  const recordMonth = Number(match[2]);
  const recordYear = Number(match[3]);
  return recordMonth === month && recordYear === year;
}

export function storedRecordMatchesSelection(
  entry: { product: IrasDsrProduct | null; record: Record<string, string | number | null | undefined> },
  month: number,
  year: number,
  product: IrasDsrProduct
): boolean {
  if (entry.product !== product) return false;
  return dsrRecordMatchesMonthYear(entry.record, month, year);
}

export function filterStoredRecordsForSelection(
  entries: Array<{ product: IrasDsrProduct | null; record: Record<string, string | number | null | undefined> }>,
  month: number,
  year: number,
  product: IrasDsrProduct
): { records: Array<Record<string, string | number | null | undefined>>; usedLegacyUntagged: boolean } {
  const monthMatches = entries.filter((entry) => dsrRecordMatchesMonthYear(entry.record, month, year));
  const productMatches = monthMatches.filter((entry) => entry.product === product);

  if (productMatches.length > 0) {
    return {
      records: productMatches.map((entry) => entry.record),
      usedLegacyUntagged: false,
    };
  }

  const hasTaggedRowsForMonth = monthMatches.some((entry) => entry.product != null);
  if (hasTaggedRowsForMonth) {
    return { records: [], usedLegacyUntagged: false };
  }

  const legacyMatches = monthMatches.filter((entry) => entry.product == null);
  return {
    records: legacyMatches.map((entry) => entry.record),
    usedLegacyUntagged: legacyMatches.length > 0,
  };
}

export function monthYearDisplayValue(month: number, year: number): string {
  const full = MONTH_FULL[month - 1] ?? "";
  return `${full} ${year}`;
}

export function monthYearShortDisplayValue(month: number, year: number): string {
  const short = MONTH_SHORT[month - 1] ?? String(month);
  return `${short} ${year}`;
}

export function monthYearDisplayMatches(actual: string, month: number, year: number): boolean {
  const normalized = actual.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalized) return false;

  const candidates = [
    monthYearDisplayValue(month, year),
    monthYearShortDisplayValue(month, year),
  ].map((value) => value.toLowerCase());

  return candidates.includes(normalized);
}

export function monthYearInputValue(month: number, year: number): string {
  const monthValue = String(month).padStart(2, "0");
  return `${year}-${monthValue}`;
}

export function monthYearOptionPatterns(month: number, year: number): string[] {
  const monthValue = String(month).padStart(2, "0");
  const short = MONTH_SHORT[month - 1] ?? "";
  const full = MONTH_FULL[month - 1] ?? "";

  return [
    `${monthValue}-${year}`,
    `${monthValue}/${year}`,
    `${short}-${year}`,
    `${short} ${year}`,
    `${short}/${year}`,
    `${full}-${year}`,
    `${full} ${year}`,
    `${full}/${year}`,
    `${year}-${monthValue}`,
    `${year}/${monthValue}`,
  ];
}

export function buildBatchPlan(options: {
  year: number;
  startMonth: number;
  endMonth: number;
  products: IrasDsrProduct[];
}): IrasDsrBatchPlan {
  const months: Array<{ year: number; month: number }> = [];
  for (let month = options.startMonth; month <= options.endMonth; month += 1) {
    months.push({ year: options.year, month });
  }
  return buildBatchPlanFromMonths(months, options.products);
}

export type IrasDsrBatchCaptureMode = "range" | "financialYear" | "months";

export interface IrasDsrBatchCaptureRequest {
  mode: IrasDsrBatchCaptureMode;
  products: IrasDsrProduct[];
  year?: number;
  startMonth?: number;
  endMonth?: number;
  fyStartYear?: number;
  monthKeys?: string[];
}

export function calendarMonthFromKey(key: string): { year: number; month: number } | null {
  const match = key.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function buildBatchPlanFromMonths(
  months: Array<{ year: number; month: number }>,
  products: IrasDsrProduct[]
): IrasDsrBatchPlan {
  const jobs: IrasDsrBatchJob[] = [];
  const sorted = [...months].sort((left, right) =>
    left.year === right.year ? left.month - right.month : left.year - right.year
  );

  for (const { year, month } of sorted) {
    for (const product of products) {
      jobs.push(buildSingleJob({ year, month, product }));
    }
  }

  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return {
    year: first?.year ?? new Date().getFullYear(),
    startMonth: first?.month ?? 1,
    endMonth: last?.month ?? 12,
    products,
    jobs,
  };
}

export function buildMonthRangeBatchPlan(options: {
  year: number;
  startMonth: number;
  endMonth: number;
  products: IrasDsrProduct[];
}): IrasDsrBatchPlan | null {
  if (
    !Number.isInteger(options.year) ||
    !Number.isInteger(options.startMonth) ||
    !Number.isInteger(options.endMonth) ||
    options.startMonth < 1 ||
    options.startMonth > 12 ||
    options.endMonth < 1 ||
    options.endMonth > 12 ||
    options.startMonth > options.endMonth ||
    options.products.length === 0
  ) {
    return null;
  }

  return buildBatchPlan(options);
}

export function buildFinancialYearBatchPlan(
  fyStartYear: number,
  products: IrasDsrProduct[]
): IrasDsrBatchPlan | null {
  if (!Number.isInteger(fyStartYear) || fyStartYear < 2000 || fyStartYear > 2100) {
    return null;
  }
  if (products.length === 0) return null;

  const months: Array<{ year: number; month: number }> = [];
  for (let month = 4; month <= 12; month += 1) {
    months.push({ year: fyStartYear, month });
  }
  for (let month = 1; month <= 3; month += 1) {
    months.push({ year: fyStartYear + 1, month });
  }

  return buildBatchPlanFromMonths(months, products);
}

export function buildSelectedMonthsBatchPlan(
  monthKeys: string[],
  products: IrasDsrProduct[]
): IrasDsrBatchPlan | null {
  if (products.length === 0 || monthKeys.length === 0) return null;

  const months = monthKeys
    .map(calendarMonthFromKey)
    .filter((entry): entry is { year: number; month: number } => entry != null);

  if (months.length === 0) return null;
  return buildBatchPlanFromMonths(months, products);
}

export function buildBatchCapturePlan(request: IrasDsrBatchCaptureRequest): IrasDsrBatchPlan | null {
  if (request.products.length === 0) return null;

  if (request.mode === "range") {
    if (request.year == null || request.startMonth == null || request.endMonth == null) {
      return null;
    }
    return buildMonthRangeBatchPlan({
      year: request.year,
      startMonth: request.startMonth,
      endMonth: request.endMonth,
      products: request.products,
    });
  }

  if (request.mode === "financialYear") {
    if (request.fyStartYear == null) return null;
    return buildFinancialYearBatchPlan(request.fyStartYear, request.products);
  }

  if (request.mode === "months") {
    return buildSelectedMonthsBatchPlan(request.monthKeys ?? [], request.products);
  }

  return null;
}

function parseProducts(input: unknown): IrasDsrProduct[] {
  if (!Array.isArray(input)) return [];

  const products: IrasDsrProduct[] = [];
  for (const value of input) {
    if (value === "MS" || value === "HSD") {
      if (!products.includes(value)) products.push(value);
    }
  }
  return products;
}

export function parseBatchCaptureRequest(input: unknown): IrasDsrBatchPlan | null {
  if (!input || typeof input !== "object") return null;

  const body = input as Record<string, unknown>;
  const mode = body.mode;
  if (mode !== "range" && mode !== "financialYear" && mode !== "months") return null;

  const products = parseProducts(body.products);
  if (products.length === 0) return null;

  const monthKeys = Array.isArray(body.monthKeys)
    ? body.monthKeys.filter((value): value is string => typeof value === "string")
    : undefined;

  return buildBatchCapturePlan({
    mode,
    products,
    year: Number(body.year),
    startMonth: Number(body.startMonth),
    endMonth: Number(body.endMonth),
    fyStartYear: Number(body.fyStartYear),
    monthKeys,
  });
}

export function describeBatchPlan(plan: IrasDsrBatchPlan): string {
  const monthCount = new Set(plan.jobs.map((job) => `${job.year}-${job.month}`)).size;
  const productLabel = plan.products.join(" + ");
  return `${monthCount} month${monthCount === 1 ? "" : "s"} × ${productLabel} (${plan.jobs.length} jobs)`;
}

export const JAN_JUL_2026_BATCH_PLAN = buildBatchPlan({
  year: 2026,
  startMonth: 1,
  endMonth: 7,
  products: ["MS", "HSD"],
});

export function parseBatchJobLabel(label: string): IrasDsrBatchJob | null {
  const trimmed = label.trim();
  const match = trimmed.match(/^([A-Za-z]{3})\s+(\d{4})\s+(MS|HSD)$/);
  if (!match) return null;

  const [, monthShort, yearText, product] = match;
  const monthIndex = MONTH_SHORT.findIndex(
    (entry) => entry.toLowerCase() === monthShort.toLowerCase()
  );
  if (monthIndex < 0) return null;

  return {
    year: Number(yearText),
    month: monthIndex + 1,
    product: product as IrasDsrProduct,
    label: trimmed,
  };
}

export function extractBatchJobLabelFromFailure(message: string): string | null {
  const match = message.trim().match(/^([A-Za-z]{3}\s+\d{4}\s+(?:MS|HSD))/);
  return match?.[1] ?? null;
}

export function buildRetryPlanFromFailedJobs(failedJobs: string[]): IrasDsrBatchPlan | null {
  const jobs: IrasDsrBatchJob[] = [];

  for (const failure of failedJobs) {
    const label = extractBatchJobLabelFromFailure(failure);
    if (!label) continue;

    const job = parseBatchJobLabel(label);
    if (job) jobs.push(job);
  }

  if (jobs.length === 0) return null;

  const months = jobs.map((job) => job.month);
  return {
    year: jobs[0]!.year,
    startMonth: Math.min(...months),
    endMonth: Math.max(...months),
    products: [...new Set(jobs.map((job) => job.product))],
    jobs,
  };
}
