import { NextResponse } from "next/server";

/** Copy out of Node's Buffer pool so Next.js can stream the file without a detached ArrayBuffer. */
export function binaryFileResponse(
  buffer: Buffer,
  filename: string,
  contentType: string
) {
  const body = Uint8Array.from(buffer);
  return new NextResponse(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(body.byteLength),
    },
  });
}

export const EXCEL_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
