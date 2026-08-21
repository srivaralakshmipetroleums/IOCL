import { formatMoneyKpi } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

interface MoneyKpiValueProps {
  amount: number;
  className?: string;
  fullClassName?: string;
}

export function MoneyKpiValue({ amount, className, fullClassName }: MoneyKpiValueProps) {
  const { primary, fullAmount } = formatMoneyKpi(amount);
  return (
    <>
      <p className={cn("mt-1 text-xl font-bold text-ioc-navy md:text-2xl", className)}>{primary}</p>
      {fullAmount && (
        <p className={cn("mt-0.5 text-xs tabular-nums text-ioc-muted", fullClassName)}>{fullAmount}</p>
      )}
    </>
  );
}
