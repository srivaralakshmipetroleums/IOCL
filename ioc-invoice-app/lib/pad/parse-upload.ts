import { decodeSpreadsheetExportBuffer } from "@/lib/bank/parse-monthly-xls";
import { parsePadStatementHtml } from "@/lib/pad/parse-pad-statement";

export function parsePadUpload(buffer: Buffer, filename: string) {
  const lower = filename.toLowerCase();
  if (!lower.endsWith(".xls")) {
    throw new Error("PAD exports must be .xls files from IOCL");
  }

  const html = decodeSpreadsheetExportBuffer(buffer);
  if (!/<html/i.test(html)) {
    throw new Error("File does not look like an IOCL PAD HTML export (.xls)");
  }

  return parsePadStatementHtml(html, filename);
}
