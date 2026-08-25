export const TWO_T_PACKET_PRICE_10 = 10;
export const TWO_T_PACKET_PRICE_20 = 20;

/** @deprecated use TWO_T_PACKET_PRICE_10 / TWO_T_PACKET_PRICE_20 */
export const TWO_T_PACKET_PRICE = TWO_T_PACKET_PRICE_20;

export interface NozzleReadings {
  start: number;
  close: number;
}

export interface DescribedAmountRow {
  id: string;
  description: string;
  amount: number;
}

export interface DayCloseCashRow {
  id: string;
  time: string;
  amount: number;
}

export interface FuelSheetInput {
  n1: NozzleReadings;
  n2: NozzleReadings;
  testingLitres: number;
  rspPerLitre: number | null;
  oil2tPackets10: number;
  oil2tPackets20: number;
  otherLubesQty: number;
  otherLubesRate: number;
  cashRows: DayCloseCashRow[];
  phonePePaytm: number;
  posCards: number;
  creditRows: DescribedAmountRow[];
  expenseRows: DescribedAmountRow[];
}

export interface FuelSheetResult {
  n1NetLitres: number;
  n2NetLitres: number;
  totalNetLitres: number;
  testingLitres: number;
  saleLitres: number;
  rspPerLitre: number | null;
  fuelAmount: number | null;
  oil2tQty10: number;
  oil2tValue10: number;
  oil2tQty20: number;
  oil2tValue20: number;
  oil2tValue: number;
  otherLubesQty: number;
  otherLubesRate: number;
  otherLubes: number;
  lubesTotal: number;
  netValue: number | null;
  cashTotal: number;
  phonePePaytm: number;
  posCards: number;
  creditsTotal: number;
  expensesTotal: number;
  totalReceipts: number;
  difference: number | null;
  matched: boolean;
}

export interface DayCloseInput {
  ms: FuelSheetInput;
  hsd: FuelSheetInput;
}

export interface DayCloseResult {
  ms: FuelSheetResult;
  hsd: FuelSheetResult;
}

function roundLitres(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function asNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function sumRows(rows: { amount: number }[]): number {
  return roundMoney(rows.reduce((sum, row) => sum + Math.max(0, asNumber(row.amount)), 0));
}

export function nozzleNetLitres(start: number, close: number): number {
  return roundLitres(asNumber(close) - asNumber(start));
}

export function computeFuelSheet(input: FuelSheetInput): FuelSheetResult {
  const n1NetLitres = nozzleNetLitres(input.n1.start, input.n1.close);
  const n2NetLitres = nozzleNetLitres(input.n2.start, input.n2.close);
  const totalNetLitres = roundLitres(n1NetLitres + n2NetLitres);
  const testingLitres = Math.max(0, asNumber(input.testingLitres));
  const saleLitres = roundLitres(totalNetLitres - testingLitres);
  const rspPerLitre =
    input.rspPerLitre != null && Number.isFinite(input.rspPerLitre) && input.rspPerLitre > 0
      ? input.rspPerLitre
      : null;
  const fuelAmount = rspPerLitre != null ? roundMoney(saleLitres * rspPerLitre) : null;
  const oil2tQty10 = Math.max(0, asNumber(input.oil2tPackets10));
  const oil2tValue10 = roundMoney(oil2tQty10 * TWO_T_PACKET_PRICE_10);
  const oil2tQty20 = Math.max(0, asNumber(input.oil2tPackets20));
  const oil2tValue20 = roundMoney(oil2tQty20 * TWO_T_PACKET_PRICE_20);
  const oil2tValue = roundMoney(oil2tValue10 + oil2tValue20);
  const otherLubesQty = Math.max(0, asNumber(input.otherLubesQty));
  const otherLubesRate = Math.max(0, asNumber(input.otherLubesRate));
  const otherLubes = roundMoney(otherLubesQty * otherLubesRate);
  const lubesTotal = roundMoney(oil2tValue + otherLubes);
  const netValue = fuelAmount != null ? roundMoney(fuelAmount + lubesTotal) : null;

  const cashTotal = sumRows(input.cashRows);
  const phonePePaytm = roundMoney(Math.max(0, asNumber(input.phonePePaytm)));
  const posCards = roundMoney(Math.max(0, asNumber(input.posCards)));
  const creditsTotal = sumRows(input.creditRows);
  const expensesTotal = sumRows(input.expenseRows);
  const totalReceipts = roundMoney(
    cashTotal + phonePePaytm + posCards + creditsTotal + expensesTotal
  );
  const difference = netValue != null ? roundMoney(totalReceipts - netValue) : null;

  return {
    n1NetLitres,
    n2NetLitres,
    totalNetLitres,
    testingLitres,
    saleLitres,
    rspPerLitre,
    fuelAmount,
    oil2tQty10,
    oil2tValue10,
    oil2tQty20,
    oil2tValue20,
    oil2tValue,
    otherLubesQty,
    otherLubesRate,
    otherLubes,
    lubesTotal,
    netValue,
    cashTotal,
    phonePePaytm,
    posCards,
    creditsTotal,
    expensesTotal,
    totalReceipts,
    difference,
    matched: difference != null && Math.abs(difference) < 0.01,
  };
}

export function computeDayClose(input: DayCloseInput): DayCloseResult {
  return {
    ms: computeFuelSheet(input.ms),
    hsd: computeFuelSheet(input.hsd),
  };
}
