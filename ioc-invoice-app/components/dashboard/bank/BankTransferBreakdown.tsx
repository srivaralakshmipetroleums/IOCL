"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BANK_CATEGORY_LABELS } from "@/lib/bank/categorize";
import { formatCurrencyINR } from "@/lib/dashboard/format";
import type { BankTransferChannelBreakdown, BankTransferPartyTotal } from "@/lib/bank/metrics";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CATEGORY_BADGE: Record<string, string> = {
  NACH_ACH: "bg-red-100 text-red-700",
  RTGS: "bg-ioc-processing-light text-ioc-mid-blue",
  NEFT: "bg-ioc-processing-light text-ioc-mid-blue",
  IMPS: "bg-ioc-processing-light text-ioc-blue",
  CHEQUE: "bg-gray-100 text-gray-700",
  OTHER: "bg-gray-100 text-gray-700",
  TRANSFER: "bg-gray-100 text-gray-700",
};

type FlowDirection = "in" | "out" | "mixed";

function lineFlow(credit: number, debit: number): { amount: number; direction: FlowDirection } | null {
  if (credit <= 0 && debit <= 0) return null;
  if (credit > 0 && debit <= 0) return { amount: credit, direction: "in" };
  if (debit > 0 && credit <= 0) return { amount: debit, direction: "out" };
  return { amount: credit + debit, direction: "mixed" };
}

function transactionCountLabel(count: number) {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? "transaction" : "transactions"}`;
}

function FlowTypeBadge({ credit, debit }: { credit: number; debit: number }) {
  const flow = lineFlow(credit, debit);
  if (!flow) return null;

  if (flow.direction === "mixed") {
    return (
      <span className="rounded bg-ioc-surface px-1.5 py-0.5 text-xs font-medium text-ioc-navy">
        Credit & debit
      </span>
    );
  }

  if (flow.direction === "in") {
    return (
      <span className="rounded bg-ioc-success-light px-1.5 py-0.5 text-xs font-medium text-ioc-success">
        Credit
      </span>
    );
  }

  return (
    <span className="rounded bg-ioc-orange-light px-1.5 py-0.5 text-xs font-medium text-ioc-orange">
      Debit
    </span>
  );
}

function AmountCell({
  credit,
  debit,
  bold,
}: {
  credit: number;
  debit: number;
  bold?: boolean;
}) {
  const flow = lineFlow(credit, debit);
  if (!flow) return <span className="text-ioc-muted">—</span>;

  return (
    <span
      className={cn(
        "tabular-nums",
        bold && "font-semibold",
        flow.direction === "in" && "text-ioc-success",
        flow.direction === "out" && "text-ioc-orange",
        flow.direction === "mixed" && "text-ioc-navy"
      )}
    >
      {formatCurrencyINR(flow.amount)}
    </span>
  );
}

interface BankTransferBreakdownProps {
  channels?: BankTransferChannelBreakdown[];
  isLoading?: boolean;
}

export function BankTransferBreakdown({ channels = [], isLoading }: BankTransferBreakdownProps) {
  const activeChannels = useMemo(
    () => channels.filter((channel) => channel.count > 0),
    [channels]
  );

  const totals = useMemo(() => {
    let count = 0;
    let amount = 0;
    for (const channel of activeChannels) {
      count += channel.count;
      amount += channel.credit + channel.debit;
    }
    return { count, amount };
  }, [activeChannels]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (category: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  if (isLoading) {
    return <Skeleton className="h-48 rounded-[10px]" />;
  }

  return (
    <div className="ioc-card overflow-hidden">
      <div className="border-b border-ioc-border px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-ioc-navy">Transfer channels</h3>
            <p className="mt-1 text-xs text-ioc-muted">
              Tap a row to see who or what each payment was for.
            </p>
          </div>
          {totals.count > 0 && (
            <p className="text-xs text-ioc-muted">
              {totals.count.toLocaleString("en-IN")} transactions ·{" "}
              <span className="font-semibold text-ioc-navy">
                {formatCurrencyINR(totals.amount)}
              </span>
            </p>
          )}
        </div>
      </div>

      {activeChannels.length === 0 ? (
        <p className="px-4 py-6 text-sm text-ioc-muted">No transfer-channel activity in this period.</p>
      ) : (
        <ul className="divide-y divide-ioc-border/70">
          {activeChannels.map((channel) => {
            const isOpen = expanded.has(channel.category);
            const canExpand = channel.parties.length > 0;

            return (
              <li key={channel.category}>
                <button
                  type="button"
                  onClick={() => canExpand && toggle(channel.category)}
                  disabled={!canExpand}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-3 text-left transition-colors sm:items-center sm:gap-3 sm:px-4",
                    canExpand && "hover:bg-ioc-surface/40",
                    !canExpand && "cursor-default"
                  )}
                >
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-ioc-muted transition-transform sm:mt-0",
                      isOpen && "rotate-180",
                      !canExpand && "opacity-0"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-semibold",
                          CATEGORY_BADGE[channel.category] ?? "bg-gray-100 text-gray-700"
                        )}
                      >
                        {BANK_CATEGORY_LABELS[channel.category] ?? channel.label}
                      </span>
                      <span className="text-xs text-ioc-muted sm:text-sm">
                        {transactionCountLabel(channel.count)}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums">
                    <AmountCell credit={channel.credit} debit={channel.debit} bold />
                  </span>
                </button>

                {isOpen && channel.parties.length > 0 && (
                  <ul className="border-t border-ioc-border/50 bg-ioc-surface/20 pb-2">
                    {channel.parties
                      .filter((party) => lineFlow(party.credit, party.debit))
                      .map((party: BankTransferPartyTotal) => (
                        <li key={party.label} className="px-3 py-2.5 pl-8 sm:px-4 sm:pl-11">
                          <p className="text-sm leading-snug break-words text-ioc-navy">
                            {party.label}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-ioc-muted">
                              {transactionCountLabel(party.count)}
                            </span>
                            <FlowTypeBadge credit={party.credit} debit={party.debit} />
                            <span className="text-sm tabular-nums sm:ml-auto">
                              <AmountCell credit={party.credit} debit={party.debit} />
                            </span>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
