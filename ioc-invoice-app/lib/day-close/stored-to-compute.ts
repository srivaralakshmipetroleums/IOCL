import { computeDayClose, type FuelSheetInput } from "@/lib/day-close/calculate";
import type { DayClosingRow, FuelSheetStored } from "@/lib/day-close/repository";

export interface DayCloseSummaryRow {
  businessDate: string;
  msSaleLitres: number;
  hsdSaleLitres: number;
  msNetValue: number | null;
  hsdNetValue: number | null;
  msTotalReceipts: number;
  hsdTotalReceipts: number;
  msMatched: boolean;
  hsdMatched: boolean;
  msDifference: number | null;
  hsdDifference: number | null;
  msPumpBoy: string | null;
  hsdPumpBoy: string | null;
}

function sheetToInput(
  sheet: FuelSheetStored,
  readings: { n1Start: number; n1Close: number; n2Start: number; n2Close: number },
  rsp: number | null,
  includeOil2t: boolean
): FuelSheetInput {
  return {
    n1: { start: readings.n1Start, close: readings.n1Close },
    n2: { start: readings.n2Start, close: readings.n2Close },
    testingLitres: sheet.testing,
    rspPerLitre: rsp,
    oil2tPackets10: includeOil2t ? sheet.oil_2t_packets_10 : 0,
    oil2tPackets20: includeOil2t ? sheet.oil_2t_packets_20 : 0,
    otherLubesQty: sheet.other_lubes_qty,
    otherLubesRate: sheet.other_lubes_rate,
    cashRows: sheet.cash_rows,
    phonePePaytm: sheet.phonepe_paytm,
    posCards: sheet.pos_cards,
    creditRows: sheet.credit_rows,
    expenseRows: sheet.expense_rows,
  };
}

export function summarizeDayClosing(closing: DayClosingRow): DayCloseSummaryRow {
  const result = computeDayClose({
    ms: sheetToInput(
      closing.ms,
      {
        n1Start: closing.ms_n1_start,
        n1Close: closing.ms_n1_close,
        n2Start: closing.ms_n2_start,
        n2Close: closing.ms_n2_close,
      },
      closing.ms_rsp,
      true
    ),
    hsd: sheetToInput(
      closing.hsd,
      {
        n1Start: closing.hsd_n1_start,
        n1Close: closing.hsd_n1_close,
        n2Start: closing.hsd_n2_start,
        n2Close: closing.hsd_n2_close,
      },
      closing.hsd_rsp,
      false
    ),
  });

  return {
    businessDate: closing.business_date,
    msSaleLitres: result.ms.saleLitres,
    hsdSaleLitres: result.hsd.saleLitres,
    msNetValue: result.ms.netValue,
    hsdNetValue: result.hsd.netValue,
    msTotalReceipts: result.ms.totalReceipts,
    hsdTotalReceipts: result.hsd.totalReceipts,
    msMatched: result.ms.matched,
    hsdMatched: result.hsd.matched,
    msDifference: result.ms.difference,
    hsdDifference: result.hsd.difference,
    msPumpBoy: closing.ms.pump_boy,
    hsdPumpBoy: closing.hsd.pump_boy,
  };
}
