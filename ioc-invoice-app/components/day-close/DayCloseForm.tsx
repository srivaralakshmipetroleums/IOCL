"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchDashboardJson } from "@/lib/dashboard/fetch";
import { formatCurrencyINR, formatIndianNumber } from "@/lib/dashboard/format";
import {
  computeDayClose,
  TWO_T_PACKET_PRICE,
  type FuelSheetResult,
} from "@/lib/day-close/calculate";
import type { DayClosingRow, FuelSheetStored } from "@/lib/day-close/repository";
import { cn } from "@/lib/utils";

interface DayCloseResponse {
  closing: DayClosingRow | null;
  rsp: { MS: number | null; HSD: number | null };
  recentDates: string[];
}

type CashFormRow = { id: string; time: string; amount: string };
type DescribedFormRow = { id: string; description: string; amount: string };

interface FuelFormState {
  n1Start: string;
  n1Close: string;
  n2Start: string;
  n2Close: string;
  testing: string;
  rsp: string;
  oil2tPackets: string;
  otherLubesQty: string;
  otherLubesRate: string;
  cashRows: CashFormRow[];
  phonePePaytm: string;
  posCards: string;
  creditRows: DescribedFormRow[];
  expenseRows: DescribedFormRow[];
  pumpBoy: string;
}

function todayLocalIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weekdayLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", { weekday: "long" });
}

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now() + Math.random());
}

function newCashRow(): CashFormRow {
  return { id: newId(), time: "", amount: "" };
}

function newDescribedRow(): DescribedFormRow {
  return { id: newId(), description: "", amount: "" };
}

function emptyFuelForm(rsp = ""): FuelFormState {
  return {
    n1Start: "",
    n1Close: "",
    n2Start: "",
    n2Close: "",
    testing: "",
    rsp,
    oil2tPackets: "",
    otherLubesQty: "",
    otherLubesRate: "",
    cashRows: [newCashRow()],
    phonePePaytm: "",
    posCards: "",
    creditRows: [newDescribedRow()],
    expenseRows: [newDescribedRow()],
    pumpBoy: "",
  };
}

function parseQty(value: string): number {
  const parsed = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseRsp(value: string): number | null {
  const parsed = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function money(value: number | null): string {
  return value == null ? "—" : formatCurrencyINR(value);
}

function litres(value: number): string {
  return `${formatIndianNumber(Number(value.toFixed(3)))} L`;
}

function formFromStored(
  start: number,
  closeN1: number,
  n2Start: number,
  n2Close: number,
  rsp: number | null,
  sheet: FuelSheetStored,
  suggestedRsp: number | null
): FuelFormState {
  const cashRows = sheet.cash_rows.length
    ? sheet.cash_rows.map((row) => ({
        id: row.id,
        time: row.time,
        amount: row.amount ? String(row.amount) : "",
      }))
    : [newCashRow()];
  const creditRows = sheet.credit_rows.length
    ? sheet.credit_rows.map((row) => ({
        id: row.id,
        description: row.description,
        amount: row.amount ? String(row.amount) : "",
      }))
    : [newDescribedRow()];
  const expenseRows = sheet.expense_rows.length
    ? sheet.expense_rows.map((row) => ({
        id: row.id,
        description: row.description,
        amount: row.amount ? String(row.amount) : "",
      }))
    : [newDescribedRow()];

  return {
    n1Start: start ? String(start) : "",
    n1Close: closeN1 ? String(closeN1) : "",
    n2Start: n2Start ? String(n2Start) : "",
    n2Close: n2Close ? String(n2Close) : "",
    testing: sheet.testing ? String(sheet.testing) : "",
    rsp: rsp != null ? String(rsp) : suggestedRsp != null ? String(suggestedRsp) : "",
    oil2tPackets: sheet.oil_2t_packets ? String(sheet.oil_2t_packets) : "",
    otherLubesQty: sheet.other_lubes_qty ? String(sheet.other_lubes_qty) : "",
    otherLubesRate: sheet.other_lubes_rate ? String(sheet.other_lubes_rate) : "",
    cashRows,
    phonePePaytm: sheet.phonepe_paytm ? String(sheet.phonepe_paytm) : "",
    posCards: sheet.pos_cards ? String(sheet.pos_cards) : "",
    creditRows,
    expenseRows,
    pumpBoy: sheet.pump_boy ?? "",
  };
}

function sheetPayload(form: FuelFormState): FuelSheetStored {
  const otherLubesQty = parseQty(form.otherLubesQty);
  const otherLubesRate = parseQty(form.otherLubesRate);
  return {
    testing: parseQty(form.testing),
    oil_2t_packets: Math.round(parseQty(form.oil2tPackets)),
    other_lubes_qty: otherLubesQty,
    other_lubes_rate: otherLubesRate,
    other_lubes: Math.round(otherLubesQty * otherLubesRate * 100) / 100,
    cash_rows: form.cashRows.map((row) => ({
      id: row.id,
      time: row.time.trim(),
      amount: parseQty(row.amount),
    })),
    phonepe_paytm: parseQty(form.phonePePaytm),
    pos_cards: parseQty(form.posCards),
    credit_rows: form.creditRows.map((row) => ({
      id: row.id,
      description: row.description.trim(),
      amount: parseQty(row.amount),
    })),
    expense_rows: form.expenseRows.map((row) => ({
      id: row.id,
      description: row.description.trim(),
      amount: parseQty(row.amount),
    })),
    pump_boy: form.pumpBoy.trim() || null,
  };
}

function toComputeInput(form: FuelFormState) {
  const sheet = sheetPayload(form);
  return {
    n1: { start: parseQty(form.n1Start), close: parseQty(form.n1Close) },
    n2: { start: parseQty(form.n2Start), close: parseQty(form.n2Close) },
    testingLitres: sheet.testing,
    rspPerLitre: parseRsp(form.rsp),
    oil2tPackets: sheet.oil_2t_packets,
    otherLubesQty: sheet.other_lubes_qty,
    otherLubesRate: sheet.other_lubes_rate,
    cashRows: sheet.cash_rows,
    phonePePaytm: sheet.phonepe_paytm,
    posCards: sheet.pos_cards,
    creditRows: sheet.credit_rows,
    expenseRows: sheet.expense_rows,
  };
}

type FuelTheme = {
  card: string;
  border: string;
  header: string;
  headerText: string;
  sectionTitle: string;
  labelBg: string;
  labelText: string;
  panel: string;
  panelBorder: string;
  value: string;
  netBar: string;
  tally: string;
  focusRing: string;
};

const MS_THEME: FuelTheme = {
  card: "bg-gradient-to-b from-[#eaf3ff] to-white",
  border: "border-ioc-blue/35",
  header: "bg-ioc-navy",
  headerText: "text-white",
  sectionTitle: "text-ioc-navy",
  labelBg: "bg-ioc-processing-light",
  labelText: "text-ioc-blue",
  panel: "bg-white",
  panelBorder: "border-ioc-blue/25",
  value: "text-ioc-navy",
  netBar: "bg-ioc-navy text-white",
  tally: "bg-ioc-navy text-white",
  focusRing: "focus-visible:ring-ioc-blue",
};

const HSD_THEME: FuelTheme = {
  card: "bg-gradient-to-b from-ioc-orange-light to-white",
  border: "border-ioc-orange/40",
  header: "bg-ioc-orange",
  headerText: "text-white",
  sectionTitle: "text-[#c77700]",
  labelBg: "bg-ioc-orange-light",
  labelText: "text-[#c77700]",
  panel: "bg-white",
  panelBorder: "border-ioc-orange/30",
  value: "text-[#9a5b00]",
  netBar: "bg-ioc-orange text-white",
  tally: "bg-[#c77700] text-white",
  focusRing: "focus-visible:ring-ioc-orange",
};

function ReadingBox({
  label,
  value,
  onChange,
  theme,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  theme: FuelTheme;
}) {
  return (
    <div className={cn("min-w-0 flex-1 border bg-white", theme.panelBorder)}>
      <div
        className={cn(
          "border-b px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide",
          theme.panelBorder,
          theme.labelBg,
          theme.labelText
        )}
      >
        {label}
      </div>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 rounded-none border-0 text-center text-sm tabular-nums focus-visible:ring-1",
          theme.focusRing
        )}
        placeholder="0"
      />
    </div>
  );
}

function CalcLine({
  label,
  value,
  editable,
  onChange,
  placeholder,
  theme,
  emphasize,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  placeholder?: string;
  theme: FuelTheme;
  emphasize?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2 border-b py-2 text-sm", theme.panelBorder)}>
      <span className={cn("min-w-0 flex-1 font-medium", theme.sectionTitle)}>{label}</span>
      {editable ? (
        <Input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn("h-9 w-28 text-right tabular-nums", theme.focusRing)}
          placeholder={placeholder ?? "0"}
        />
      ) : (
        <span
          className={cn(
            "w-28 text-right tabular-nums",
            emphasize ? "text-base font-bold" : "font-semibold",
            theme.value
          )}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function RowList<T extends { id: string }>({
  title,
  rows,
  onAdd,
  onRemove,
  addLabel,
  children,
}: {
  title: string;
  rows: T[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
  children: (row: T, index: number, remove: () => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ioc-muted">{title}</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id}>{children(row, index, () => onRemove(row.id))}</div>
        ))}
      </div>
    </div>
  );
}

function FuelColumn({
  title,
  theme,
  tallyLabel,
  form,
  setForm,
  suggestedRsp,
  result,
}: {
  title: string;
  theme: FuelTheme;
  tallyLabel: string;
  form: FuelFormState;
  setForm: (next: FuelFormState | ((current: FuelFormState) => FuelFormState)) => void;
  suggestedRsp: number | null;
  result: FuelSheetResult;
}) {
  const update = (patch: Partial<FuelFormState>) => setForm((current) => ({ ...current, ...patch }));

  return (
    <div className={cn("space-y-4 overflow-hidden rounded-[12px] border shadow-sm", theme.card, theme.border)}>
      <div className={cn("-mx-0 px-4 py-3", theme.header)}>
        <h3 className={cn("text-center text-base font-bold uppercase tracking-wide", theme.headerText)}>
          {title}
        </h3>
      </div>

      <div className="space-y-4 px-4 pb-4">
      {/* N1 */}
      <div className="space-y-2">
        <p className={cn("text-center text-xs font-bold uppercase tracking-wide", theme.sectionTitle)}>
          Nozzle 1 (N1)
        </p>
        <div className={cn("flex overflow-hidden rounded-[6px] border", theme.panelBorder)}>
          <ReadingBox
            label="Starting reading (Ltr.)"
            value={form.n1Start}
            onChange={(v) => update({ n1Start: v })}
            theme={theme}
          />
          <ReadingBox
            label="Closing reading (Ltr.)"
            value={form.n1Close}
            onChange={(v) => update({ n1Close: v })}
            theme={theme}
          />
        </div>
        <CalcLine
          label="Net sale (Ltr.) (N1) ="
          value={litres(result.n1NetLitres)}
          theme={theme}
        />
      </div>

      {/* N2 */}
      <div className="space-y-2">
        <p className={cn("text-center text-xs font-bold uppercase tracking-wide", theme.sectionTitle)}>
          Nozzle 2 (N2)
        </p>
        <div className={cn("flex overflow-hidden rounded-[6px] border", theme.panelBorder)}>
          <ReadingBox
            label="Starting reading (Ltr.)"
            value={form.n2Start}
            onChange={(v) => update({ n2Start: v })}
            theme={theme}
          />
          <ReadingBox
            label="Closing reading (Ltr.)"
            value={form.n2Close}
            onChange={(v) => update({ n2Close: v })}
            theme={theme}
          />
        </div>
        <CalcLine
          label="Net sale (Ltr.) (N2) ="
          value={litres(result.n2NetLitres)}
          theme={theme}
        />
      </div>

      {/* Totals — matches paper form order */}
      <div className={cn("space-y-0 rounded-[6px] border px-3", theme.panel, theme.panelBorder)}>
        <CalcLine
          label="Total net sale (Ltr.) (N1 + N2) ="
          value={litres(result.totalNetLitres)}
          theme={theme}
        />
        <CalcLine
          label="Testing litres (Ltr.) ="
          value={form.testing}
          editable
          onChange={(v) => update({ testing: v })}
          placeholder="0"
          theme={theme}
        />
        <CalcLine
          label="Sale litres after testing ="
          value={litres(result.saleLitres)}
          theme={theme}
          emphasize
        />
        <CalcLine
          label="RSP (₹ / Ltr.) ="
          value={form.rsp}
          editable
          onChange={(v) => update({ rsp: v })}
          placeholder={suggestedRsp != null ? String(suggestedRsp) : "0.00"}
          theme={theme}
        />
        {suggestedRsp != null && (
          <p className="pb-1 text-right text-[11px] text-ioc-muted">
            Price on file: {formatCurrencyINR(suggestedRsp)} / L
          </p>
        )}
        <CalcLine
          label="Amount (₹) ="
          value={money(result.fuelAmount)}
          theme={theme}
          emphasize
        />
      </div>

      {/* Lubes table — matches paper form */}
      <div className="space-y-2">
        <p className={cn("text-center text-xs font-bold uppercase tracking-wide", theme.sectionTitle)}>
          Lubes &amp; other sales
        </p>
        <div className={cn("overflow-x-auto rounded-[6px] border bg-white", theme.panelBorder)}>
          <table className="w-full min-w-[360px] text-sm">
            <thead>
              <tr
                className={cn(
                  "border-b text-left text-[10px] uppercase tracking-wide",
                  theme.panelBorder,
                  theme.labelBg,
                  theme.labelText
                )}
              >
                <th className="px-2 py-2 font-semibold">Description</th>
                <th className="px-2 py-2 text-right font-semibold">Qty</th>
                <th className="px-2 py-2 text-right font-semibold">Rate (₹)</th>
                <th className="px-2 py-2 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr className={cn("border-b", theme.panelBorder)}>
                <td className={cn("px-2 py-2", theme.sectionTitle)}>
                  2T oil packets (₹{TWO_T_PACKET_PRICE} each)
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    inputMode="numeric"
                    value={form.oil2tPackets}
                    onChange={(e) => update({ oil2tPackets: e.target.value })}
                    className={cn("h-8 text-right tabular-nums", theme.focusRing)}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-ioc-muted">
                  {TWO_T_PACKET_PRICE.toFixed(2)}
                </td>
                <td className={cn("px-2 py-2 text-right font-medium tabular-nums", theme.value)}>
                  {money(result.oil2tValue)}
                </td>
              </tr>
              <tr className={cn("border-b", theme.panelBorder)}>
                <td className={cn("px-2 py-2", theme.sectionTitle)}>Other lubes / products</td>
                <td className="px-2 py-1.5">
                  <Input
                    inputMode="decimal"
                    value={form.otherLubesQty}
                    onChange={(e) => update({ otherLubesQty: e.target.value })}
                    className={cn("h-8 text-right tabular-nums", theme.focusRing)}
                    placeholder="0"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    inputMode="decimal"
                    value={form.otherLubesRate}
                    onChange={(e) => update({ otherLubesRate: e.target.value })}
                    className={cn("h-8 text-right tabular-nums", theme.focusRing)}
                    placeholder="0"
                  />
                </td>
                <td className={cn("px-2 py-2 text-right font-medium tabular-nums", theme.value)}>
                  {money(result.otherLubes)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <CalcLine label="Total lubes sale =" value={money(result.lubesTotal)} theme={theme} />
        <div className={cn("rounded-[6px] px-3 py-2.5", theme.netBar)}>
          <div className="flex items-center justify-between gap-2 text-sm font-semibold">
            <span>Net value (fuel amount + lubes sale) =</span>
            <span className="tabular-nums">{money(result.netValue)}</span>
          </div>
        </div>
      </div>

      {/* Cash & receipts */}
      <div className={cn("space-y-3 border-t pt-3", theme.panelBorder)}>
        <RowList
          title="Cash collected"
          rows={form.cashRows}
          addLabel="Add row"
          onAdd={() => update({ cashRows: [...form.cashRows, newCashRow()] })}
          onRemove={(id) =>
            update({
              cashRows:
                form.cashRows.length === 1
                  ? form.cashRows
                  : form.cashRows.filter((row) => row.id !== id),
            })
          }
        >
          {(row, _index, remove) => (
            <div className="grid grid-cols-[1fr_120px_auto] gap-2">
              <Input
                value={row.time}
                onChange={(e) =>
                  update({
                    cashRows: form.cashRows.map((item) =>
                      item.id === row.id ? { ...item, time: e.target.value } : item
                    ),
                  })
                }
                placeholder="Time"
              />
              <Input
                inputMode="decimal"
                value={row.amount}
                onChange={(e) =>
                  update({
                    cashRows: form.cashRows.map((item) =>
                      item.id === row.id ? { ...item, amount: e.target.value } : item
                    ),
                  })
                }
                placeholder="₹"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={form.cashRows.length === 1}
                onClick={remove}
                aria-label="Remove cash row"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </RowList>
        <p className="text-xs text-ioc-muted">Total cash: {money(result.cashTotal)}</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">PhonePe / Paytm (₹)</Label>
            <Input
              inputMode="decimal"
              value={form.phonePePaytm}
              onChange={(e) => update({ phonePePaytm: e.target.value })}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">POS / cards (₹)</Label>
            <Input
              inputMode="decimal"
              value={form.posCards}
              onChange={(e) => update({ posCards: e.target.value })}
              placeholder="0"
            />
          </div>
        </div>

        <RowList
          title="Credits"
          rows={form.creditRows}
          addLabel="Add credit"
          onAdd={() => update({ creditRows: [...form.creditRows, newDescribedRow()] })}
          onRemove={(id) =>
            update({
              creditRows:
                form.creditRows.length === 1
                  ? form.creditRows
                  : form.creditRows.filter((row) => row.id !== id),
            })
          }
        >
          {(row, _index, remove) => (
            <div className="grid grid-cols-[1fr_120px_auto] gap-2">
              <Input
                value={row.description}
                onChange={(e) =>
                  update({
                    creditRows: form.creditRows.map((item) =>
                      item.id === row.id ? { ...item, description: e.target.value } : item
                    ),
                  })
                }
                placeholder="e.g. TMC, SVM School"
              />
              <Input
                inputMode="decimal"
                value={row.amount}
                onChange={(e) =>
                  update({
                    creditRows: form.creditRows.map((item) =>
                      item.id === row.id ? { ...item, amount: e.target.value } : item
                    ),
                  })
                }
                placeholder="₹"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={form.creditRows.length === 1}
                onClick={remove}
                aria-label="Remove credit"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </RowList>

        <RowList
          title="Expenses paid (from cash)"
          rows={form.expenseRows}
          addLabel="Add expense"
          onAdd={() => update({ expenseRows: [...form.expenseRows, newDescribedRow()] })}
          onRemove={(id) =>
            update({
              expenseRows:
                form.expenseRows.length === 1
                  ? form.expenseRows
                  : form.expenseRows.filter((row) => row.id !== id),
            })
          }
        >
          {(row, _index, remove) => (
            <div className="grid grid-cols-[1fr_120px_auto] gap-2">
              <Input
                value={row.description}
                onChange={(e) =>
                  update({
                    expenseRows: form.expenseRows.map((item) =>
                      item.id === row.id ? { ...item, description: e.target.value } : item
                    ),
                  })
                }
                placeholder="e.g. Courier"
              />
              <Input
                inputMode="decimal"
                value={row.amount}
                onChange={(e) =>
                  update({
                    expenseRows: form.expenseRows.map((item) =>
                      item.id === row.id ? { ...item, amount: e.target.value } : item
                    ),
                  })
                }
                placeholder="₹"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={form.expenseRows.length === 1}
                onClick={remove}
                aria-label="Remove expense"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </RowList>
      </div>

      <div className={cn("space-y-1 rounded-lg px-3 py-3 text-sm", theme.tally)}>
        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{tallyLabel}</p>
        <div className="flex justify-between gap-3">
          <span>Net value</span>
          <span className="tabular-nums">{money(result.netValue)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Total receipts</span>
          <span className="tabular-nums">{money(result.totalReceipts)}</span>
        </div>
        <div className="flex justify-between gap-3 font-semibold">
          <span>Difference</span>
          <span
            className={cn(
              "tabular-nums",
              result.matched ? "text-green-200" : result.difference != null ? "text-amber-100" : ""
            )}
          >
            {money(result.difference)}
          </span>
        </div>
        <p className="pt-1 text-xs text-white/70">
          Receipts = cash + PhonePe/Paytm + POS + credits + expenses from cash.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Pump boy (handling these sales)</Label>
        <Input
          value={form.pumpBoy}
          onChange={(e) => update({ pumpBoy: e.target.value })}
          placeholder="Name"
        />
      </div>
      </div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-ioc-muted">{label}</span>
      <span className="font-semibold tabular-nums text-ioc-navy">{value}</span>
    </div>
  );
}

function FuelMiniSummary({
  title,
  theme,
  result,
  pumpBoy,
}: {
  title: string;
  theme: FuelTheme;
  result: FuelSheetResult;
  pumpBoy: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[12px] border shadow-sm", theme.card, theme.border)}>
      <div className={cn("px-4 py-3", theme.header)}>
        <h3 className={cn("text-center text-sm font-bold uppercase tracking-wide", theme.headerText)}>
          {title}
        </h3>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-2">
          <p className={cn("text-xs font-bold uppercase tracking-wide", theme.sectionTitle)}>
            Sales
          </p>
          <MiniRow label="Sale litres (after testing)" value={litres(result.saleLitres)} />
          <MiniRow
            label="RSP"
            value={
              result.rspPerLitre != null ? `${formatCurrencyINR(result.rspPerLitre)} / L` : "—"
            }
          />
          <MiniRow label="Fuel amount" value={money(result.fuelAmount)} />
          <MiniRow label="Lubes" value={money(result.lubesTotal)} />
          <div className={cn("rounded-[6px] px-3 py-2", theme.netBar)}>
            <div className="flex items-center justify-between gap-2 text-sm font-semibold">
              <span>Total amount (fuel + lubes)</span>
              <span className="tabular-nums">{money(result.netValue)}</span>
            </div>
          </div>
        </div>

        <div className={cn("space-y-2 border-t pt-3", theme.panelBorder)}>
          <p className={cn("text-xs font-bold uppercase tracking-wide", theme.sectionTitle)}>
            Collections
          </p>
          <MiniRow label="Total cash" value={money(result.cashTotal)} />
          <MiniRow label="PhonePe / Paytm" value={money(result.phonePePaytm)} />
          <MiniRow label="POS / cards" value={money(result.posCards)} />
          <MiniRow label="Total credits" value={money(result.creditsTotal)} />
          <MiniRow label="Total expenses" value={money(result.expensesTotal)} />
        </div>

        <div className={cn("space-y-1 rounded-lg px-3 py-3 text-sm", theme.tally)}>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Tally summary
          </p>
          <div className="flex justify-between gap-3">
            <span>Net value</span>
            <span className="tabular-nums">{money(result.netValue)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Total receipts</span>
            <span className="tabular-nums">{money(result.totalReceipts)}</span>
          </div>
          <div className="flex justify-between gap-3 font-semibold">
            <span>Difference</span>
            <span
              className={cn(
                "tabular-nums",
                result.matched ? "text-green-200" : result.difference != null ? "text-amber-100" : ""
              )}
            >
              {money(result.difference)}
              {result.matched ? " · matched" : ""}
            </span>
          </div>
        </div>

        <MiniRow label="Pump boy" value={pumpBoy.trim() || "—"} />
      </div>
    </div>
  );
}

export function DayCloseForm() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayLocalIso);
  const [ms, setMs] = useState<FuelFormState>(() => emptyFuelForm());
  const [hsd, setHsd] = useState<FuelFormState>(() => emptyFuelForm());
  const [message, setMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const hydratedDate = useRef<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<DayCloseResponse>({
    queryKey: ["day-close", date],
    queryFn: () => fetchDashboardJson(`/api/day-close?date=${date}`),
  });

  const hasSaved = Boolean(data?.closing);
  const showSummary = hasSaved && !isEditing;

  useEffect(() => {
    hydratedDate.current = null;
    setMs(emptyFuelForm());
    setHsd(emptyFuelForm());
    setMessage(null);
    setIsEditing(false);
    setConfirmEdit(false);
  }, [date]);

  useEffect(() => {
    if (!data || hydratedDate.current === date) return;
    hydratedDate.current = date;

    const closing = data.closing;
    if (closing) {
      setMs(
        formFromStored(
          closing.ms_n1_start,
          closing.ms_n1_close,
          closing.ms_n2_start,
          closing.ms_n2_close,
          closing.ms_rsp,
          closing.ms,
          data.rsp.MS
        )
      );
      setHsd(
        formFromStored(
          closing.hsd_n1_start,
          closing.hsd_n1_close,
          closing.hsd_n2_start,
          closing.hsd_n2_close,
          closing.hsd_rsp,
          closing.hsd,
          data.rsp.HSD
        )
      );
      setIsEditing(false);
      setConfirmEdit(false);
      return;
    }

    setMs(emptyFuelForm(data.rsp.MS != null ? String(data.rsp.MS) : ""));
    setHsd(emptyFuelForm(data.rsp.HSD != null ? String(data.rsp.HSD) : ""));
    setIsEditing(true);
    setConfirmEdit(false);
  }, [data, date]);

  const result = useMemo(
    () =>
      computeDayClose({
        ms: toComputeInput(ms),
        hsd: toComputeInput(hsd),
      }),
    [ms, hsd]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/day-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_date: date,
          ms_n1_start: parseQty(ms.n1Start),
          ms_n1_close: parseQty(ms.n1Close),
          ms_n2_start: parseQty(ms.n2Start),
          ms_n2_close: parseQty(ms.n2Close),
          ms_rsp: parseRsp(ms.rsp),
          hsd_n1_start: parseQty(hsd.n1Start),
          hsd_n1_close: parseQty(hsd.n1Close),
          hsd_n2_start: parseQty(hsd.n2Start),
          hsd_n2_close: parseQty(hsd.n2Close),
          hsd_rsp: parseRsp(hsd.rsp),
          ms: sheetPayload(ms),
          hsd: sheetPayload(hsd),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Failed to save day close");
      }
    },
    onSuccess: () => {
      hydratedDate.current = null;
      queryClient.invalidateQueries({ queryKey: ["day-close"] });
      setIsEditing(false);
      setConfirmEdit(false);
      setMessage("Day account saved.");
    },
    onError: (err: Error) => setMessage(err.message),
  });

  function cancelEdit() {
    const closing = data?.closing;
    if (!closing) {
      setIsEditing(false);
      setConfirmEdit(false);
      return;
    }
    setMs(
      formFromStored(
        closing.ms_n1_start,
        closing.ms_n1_close,
        closing.ms_n2_start,
        closing.ms_n2_close,
        closing.ms_rsp,
        closing.ms,
        data?.rsp.MS ?? null
      )
    );
    setHsd(
      formFromStored(
        closing.hsd_n1_start,
        closing.hsd_n1_close,
        closing.hsd_n2_start,
        closing.hsd_n2_close,
        closing.hsd_rsp,
        closing.hsd,
        data?.rsp.HSD ?? null
      )
    );
    setIsEditing(false);
    setConfirmEdit(false);
    setMessage(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <PageTitle>Daily totalizer readings &amp; sale summary</PageTitle>
          <p className="text-sm text-ioc-muted">
            MS and HSD side by side. After N1 + N2 net sale, subtract testing litres, then apply RSP
            and lubes. Each side tallies its own cash, UPI, cards, credits and expenses.
          </p>
        </div>
        <div className="grid gap-3 sm:w-[360px] sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Day</Label>
            <Input value={weekdayLabel(date)} readOnly />
          </div>
        </div>
      </div>

      {showSummary && (
        <div className="rounded-lg border border-ioc-success/30 bg-ioc-success-light px-4 py-3 text-sm text-ioc-navy">
          Day account is already saved for this date. Values are locked. Change only if you need to
          correct them.
        </div>
      )}

      {isEditing && hasSaved && (
        <div className="rounded-lg border border-ioc-orange/40 bg-ioc-orange-light px-4 py-3 text-sm text-ioc-navy">
          <p className="font-medium">You are editing a saved day account.</p>
          <p className="mt-1 text-ioc-muted">
            Saving will replace the existing values for this date. Cancel to keep the saved summary.
          </p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-ioc-error/30 bg-ioc-error-light px-4 py-3 text-sm text-ioc-error">
          {error instanceof Error ? error.message : "Failed to load day close"}
        </div>
      )}

      {showSummary ? (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <FuelMiniSummary
            title="MS (Petrol)"
            theme={MS_THEME}
            result={result.ms}
            pumpBoy={ms.pumpBoy}
          />
          <FuelMiniSummary
            title="HSD (Diesel)"
            theme={HSD_THEME}
            result={result.hsd}
            pumpBoy={hsd.pumpBoy}
          />
        </div>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <FuelColumn
            title="MS (Petrol)"
            theme={MS_THEME}
            tallyLabel="Tally summary (MS)"
            form={ms}
            setForm={setMs}
            suggestedRsp={data?.rsp.MS ?? null}
            result={result.ms}
          />
          <FuelColumn
            title="HSD (Diesel)"
            theme={HSD_THEME}
            tallyLabel="Tally summary (HSD)"
            form={hsd}
            setForm={setHsd}
            suggestedRsp={data?.rsp.HSD ?? null}
            result={result.hsd}
          />
        </div>
      )}

      {data?.recentDates?.length ? (
        <p className="text-xs text-ioc-muted">Saved dates: {data.recentDates.join(", ")}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        {showSummary ? (
          confirmEdit ? (
            <>
              <Button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setConfirmEdit(false);
                  setMessage(null);
                }}
              >
                Yes, change saved values
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmEdit(false)}
              >
                Keep saved values
              </Button>
              <p className="text-sm text-ioc-muted">
                Day account is already saved. Change only if you want to correct it.
              </p>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmEdit(true);
                setMessage(null);
              }}
            >
              Change day account
            </Button>
          )
        ) : (
          <>
            <Button
              type="button"
              onClick={() => {
                setMessage(null);
                saveMutation.mutate();
              }}
              disabled={saveMutation.isPending || isLoading}
            >
              {saveMutation.isPending
                ? "Saving..."
                : hasSaved
                  ? "Save changes"
                  : "Save day account"}
            </Button>
            {hasSaved && (
              <Button type="button" variant="outline" onClick={cancelEdit} disabled={saveMutation.isPending}>
                Cancel
              </Button>
            )}
          </>
        )}
        {message && <p className="text-sm text-ioc-muted">{message}</p>}
      </div>
    </div>
  );
}
