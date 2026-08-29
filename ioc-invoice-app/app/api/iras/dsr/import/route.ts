import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { parseDsrExcelBuffer } from "@/lib/iras/dsr/parse-dsr-excel";
import { persistDsrCapture } from "@/lib/iras/dsr/repository";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";
import { createServiceClient } from "@/lib/supabase/server";

function parseProduct(value: FormDataEntryValue | null): IrasDsrProduct | null {
  if (value === "MS" || value === "HSD") return value;
  return null;
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const form = await request.formData();
  const file = form.get("file");
  const product = parseProduct(form.get("product"));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing Excel file" }, { status: 400 });
  }
  if (!product) {
    return NextResponse.json({ error: "Product must be MS or HSD" }, { status: 400 });
  }

  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
    return NextResponse.json({ error: "Upload an Excel file (.xlsx)" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseDsrExcelBuffer(buffer, product, file.name);

    const supabase = await createServiceClient();
    const result = await persistDsrCapture(
      supabase,
      {
        columns: parsed.columns,
        data: parsed.records,
        totalCount: parsed.records.length,
        source: "excel_import",
        sourceFilename: parsed.sourceFilename,
      },
      {
        month: parsed.month,
        year: parsed.year,
        product: parsed.product,
        label: `${parsed.product} ${String(parsed.month).padStart(2, "0")}/${parsed.year} Excel`,
      }
    );

    const firstDate =
      typeof parsed.records[0]?.date_time === "string" ? parsed.records[0].date_time : null;
    const lastDate =
      typeof parsed.records.at(-1)?.date_time === "string"
        ? parsed.records.at(-1)?.date_time
        : null;

    return NextResponse.json({
      ok: true,
      product: parsed.product,
      month: parsed.month,
      year: parsed.year,
      recordsInserted: result.recordsInserted,
      recordsSkipped: result.recordsSkipped,
      captureId: result.captureId,
      recordCount: parsed.records.length,
      firstDate,
      lastDate,
      tankLabel: parsed.tankLabel,
      warnings: parsed.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DSR import failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
