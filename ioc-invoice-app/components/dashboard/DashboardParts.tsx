import { cn } from "@/lib/utils";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="ioc-section-heading mb-4 mt-8 border-l-[3px] border-ioc-orange pl-3">
      {children}
    </h2>
  );
}

export function ProductTag({ product }: { product: string }) {
  const upper = (product || "").toUpperCase();
  const tagClass = upper.includes("EBMS")
    ? "bg-ioc-processing-light text-ioc-navy"
    : upper.includes("HSD")
      ? "bg-ioc-orange-light text-[#C77700]"
      : "bg-ioc-warning-light text-ioc-warning";

  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", tagClass)}>
      {product}
    </span>
  );
}
