import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { binaryFileResponse, EXCEL_CONTENT_TYPE } from "@/lib/http/binary-file-response";
import { generateDsrLedgerExcel } from "@/lib/iras/dsr/ledger-excel";
import type { DsrLedgerRow } from "@/lib/iras/dsr/normalize";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";

const MAX_EXPORT_ROWS = 5000;

function isProduct(value: unknown): value is IrasDsrProduct {
  return value === "MS" || value === "HSD";
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLedgerRow(value: unknown): DsrLedgerRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.date !== "string" || !row.date) return null;
  if (!isProduct(row.product)) return null;
  const dateDisplay = typeof row.dateDisplay === "string" ? row.dateDisplay : row.date;
  const id = typeof row.id === "string" ? row.id : `${row.date}::${row.product}`;

  return {
    id,
    date: row.date,
    dateDisplay,
    product: row.product,
    productDip: parseNumber(row.productDip),
    productVolume: parseNumber(row.productVolume),
    totalOpeningStock: parseNumber(row.totalOpeningStock),
    receiptAsAutomation: parseNumber(row.receiptAsAutomation),
    totalStock: parseNumber(row.totalStock),
    nozzleN1: parseNumber(row.nozzleN1),
    nozzleN2: parseNumber(row.nozzleN2),
    testingLitres: parseNumber(row.testingLitres),
    netTankSales: parseNumber(row.netTankSales),
    netTotalizerSales: parseNumber(row.netTotalizerSales),
    netCumulativeTotalizerSales: parseNumber(row.netCumulativeTotalizerSales),
    netTransactionSales: parseNumber(row.netTransactionSales),
    netCumulativeTransactionSales: parseNumber(row.netCumulativeTransactionSales),
    lossGainDayTotalizer: parseNumber(row.lossGainDayTotalizer),
    cummLossGainMonthTotalizer: parseNumber(row.cummLossGainMonthTotalizer),
    lossGainDayTransaction: parseNumber(row.lossGainDayTransaction),
    cummLossGainMonthTransaction: parseNumber(row.cummLossGainMonthTransaction),
    rspPerLitre: parseNumber(row.rspPerLitre),
    grossProfit: parseNumber(row.grossProfit),
  };
}

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const dateFrom = typeof body.dateFrom === "string" ? body.dateFrom : "";
  const dateTo = typeof body.dateTo === "string" ? body.dateTo : "";
  const label = typeof body.label === "string" ? body.label : undefined;
  const columnKeys = Array.isArray(body.columnKeys)
    ? body.columnKeys.filter((value): value is string => typeof value === "string")
    : [];

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: "dateFrom and dateTo are required" }, { status: 400 });
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "No ledger rows to export" }, { status: 400 });
  }

  if (body.rows.length > MAX_EXPORT_ROWS) {
    return NextResponse.json(
      { error: `Export is limited to ${MAX_EXPORT_ROWS} rows` },
      { status: 400 }
    );
  }

  const rows = body.rows
    .map(parseLedgerRow)
    .filter((row): row is DsrLedgerRow => row != null);

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid ledger rows to export" }, { status: 400 });
  }

  try {
    const { buffer, filename } = await generateDsrLedgerExcel({
      rows,
      columnKeys,
      dateFrom,
      dateTo,
      label,
    });
    return binaryFileResponse(buffer, filename, EXCEL_CONTENT_TYPE);
  } catch (error) {
    const message = error instanceof Error ? error.message : "DSR ledger export failed";
    console.error("[dashboard/dsr/export]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
