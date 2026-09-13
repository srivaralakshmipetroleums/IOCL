import { decodeSpreadsheetExportBuffer } from "@/lib/bank/parse-monthly-xls";
import { parsePadStatementHtml } from "@/lib/pad/parse-pad-statement";

function looksLikePadExport(text: string): boolean {
  return (
    /Customer:-/i.test(text) ||
    /id="cust"/i.test(text) ||
    /table table-bordered/i.test(text) ||
    /From\s+\d{1,2}-[A-Za-z]{3}-\d{4}\s+To\s+\d{1,2}-[A-Za-z]{3}-\d{4}/i.test(text)
  );
}

export function parsePadUpload(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".xls")) {
    throw new Error("PAD exports must be .xls files from IOCL");
  }

  const html = decodeSpreadsheetExportBuffer(buffer);
  if (!looksLikePadExport(html)) {
    throw new Error(
      "File does not look like an IOCL PAD export. Download from the IOCL portal as .xls (HTML export), not Excel."
    );
  }

  const parsed = parsePadStatementHtml(html, filename);
  if (!parsed.periodFrom || !parsed.periodTo) {
    throw new Error("Could not read PAD period dates from the file");
  }

  return parsed;
}
