const MONTH_INDEX: Record<string, string> = {
  jan: "01",
  january: "01",
  feb: "02",
  february: "02",
  mar: "03",
  march: "03",
  apr: "04",
  april: "04",
  may: "05",
  jun: "06",
  june: "06",
  jul: "07",
  july: "07",
  aug: "08",
  august: "08",
  sep: "09",
  sept: "09",
  september: "09",
  oct: "10",
  october: "10",
  nov: "11",
  november: "11",
  dec: "12",
  december: "12",
};

export function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/^_/, "")
    .trim();
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseOptionalAmount(value: unknown): number | null {
  if (value === "" || value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, "").replace(/^_/, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** ExcelJS often stores SBI dates as UTC midnight. Prefer ISO date to avoid TZ shifts. */
export function toIsoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const ms = excelEpoch + Math.round(value * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const dmy = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const dMonY = text.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (dMonY) {
    const month = MONTH_INDEX[dMonY[2].toLowerCase()];
    if (month) return `${dMonY[3]}-${month}-${dMonY[1].padStart(2, "0")}`;
  }

  return null;
}

export function normalizeAccountNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.replace(/^0+/, "") || digits;
}

export function fyLabelFromDate(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const fyStart = month >= 4 ? year : year - 1;
  return `FY ${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;
}

export function headerLabel(text: string): string {
  return text.split(":")[0].replace(/\s+/g, " ").trim().toLowerCase();
}
