import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const simpleTableClasses = {
  card: "ioc-card min-w-0 overflow-hidden",
  wrap: "min-w-0 overflow-hidden",
  wrapScroll: "min-w-0 overflow-x-auto",
  table2: "w-full table-fixed text-sm",
  table3: "w-full table-fixed text-sm",
  table4: "w-full table-fixed text-sm",
  headRow:
    "border-b border-ioc-border bg-ioc-section/80 text-left text-xs uppercase tracking-wide text-ioc-muted",
  th2Label: "w-[58%] px-2 py-2 font-semibold sm:px-3 sm:py-2.5",
  th2Value: "w-[42%] px-2 py-2 text-right font-semibold sm:px-3 sm:py-2.5",
  td2Label: "px-2 py-2 text-sm leading-snug text-ioc-navy break-words sm:px-3 sm:py-2.5",
  td2Value: "whitespace-nowrap px-2 py-2 text-right text-sm tabular-nums sm:px-3 sm:py-2.5",
  th3First: "w-[40%] px-2 py-2 font-semibold sm:px-3 sm:py-2.5",
  th3Rest: "w-[30%] px-2 py-2 text-right font-semibold sm:px-3 sm:py-2.5",
  td3First: "px-2 py-2 text-sm sm:px-3 sm:py-2.5",
  td3Rest: "whitespace-nowrap px-2 py-2 text-right text-sm tabular-nums sm:px-3 sm:py-2.5",
  row: "border-b border-ioc-border/50",
  rowBold: "bg-ioc-section/60 font-semibold",
} as const;

export function SimpleTableWrap({
  children,
  className,
  scroll = false,
  card = false,
}: {
  children: ReactNode;
  className?: string;
  scroll?: boolean;
  card?: boolean;
}) {
  return (
    <div
      className={cn(
        card ? simpleTableClasses.card : scroll ? simpleTableClasses.wrapScroll : simpleTableClasses.wrap,
        className
      )}
    >
      {children}
    </div>
  );
}

export function WideTableScroll({
  children,
  className,
  hint = true,
}: {
  children: ReactNode;
  className?: string;
  hint?: boolean;
}) {
  return (
    <div className={cn(simpleTableClasses.wrapScroll, className)}>
      {hint && (
        <p className="px-3 pt-2 text-xs text-ioc-muted sm:hidden">Swipe for more columns</p>
      )}
      {children}
    </div>
  );
}

export function TwoColumnTable({
  labelHeader = "Particular",
  valueHeader = "Amount",
  children,
  className,
  card = true,
}: {
  labelHeader?: string;
  valueHeader?: string;
  children: ReactNode;
  className?: string;
  card?: boolean;
}) {
  return (
    <SimpleTableWrap card={card} className={className}>
      <table className={simpleTableClasses.table2}>
        <thead>
          <tr className={simpleTableClasses.headRow}>
            <th className={simpleTableClasses.th2Label}>{labelHeader}</th>
            <th className={simpleTableClasses.th2Value}>{valueHeader}</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </SimpleTableWrap>
  );
}

export function TwoColumnRow({
  label,
  value,
  bold = false,
}: {
  label: ReactNode;
  value: ReactNode;
  bold?: boolean;
}) {
  return (
    <tr className={bold ? simpleTableClasses.rowBold : simpleTableClasses.row}>
      <td className={simpleTableClasses.td2Label}>{label}</td>
      <td className={simpleTableClasses.td2Value}>{value}</td>
    </tr>
  );
}

export function ThreeColumnTable({
  col1Header,
  col2Header,
  col3Header,
  children,
  className,
  card = true,
}: {
  col1Header: ReactNode;
  col2Header: ReactNode;
  col3Header: ReactNode;
  children: ReactNode;
  className?: string;
  card?: boolean;
}) {
  return (
    <SimpleTableWrap card={card} className={className}>
      <table className={simpleTableClasses.table3}>
        <thead>
          <tr className={simpleTableClasses.headRow}>
            <th className={simpleTableClasses.th3First}>{col1Header}</th>
            <th className={simpleTableClasses.th3Rest}>{col2Header}</th>
            <th className={simpleTableClasses.th3Rest}>{col3Header}</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </SimpleTableWrap>
  );
}

export function ThreeColumnRow({
  col1,
  col2,
  col3,
  bold = false,
}: {
  col1: ReactNode;
  col2: ReactNode;
  col3: ReactNode;
  bold?: boolean;
}) {
  return (
    <tr className={bold ? simpleTableClasses.rowBold : simpleTableClasses.row}>
      <td className={simpleTableClasses.td3First}>{col1}</td>
      <td className={simpleTableClasses.td3Rest}>{col2}</td>
      <td className={simpleTableClasses.td3Rest}>{col3}</td>
    </tr>
  );
}
