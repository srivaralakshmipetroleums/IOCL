import { cn } from "@/lib/utils";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3.5 mt-7 border-l-4 border-[#F4A900] pl-3 text-sm font-bold uppercase tracking-wide text-[#1F4E79]">
      {children}
    </h2>
  );
}

export function ProductTag({ product }: { product: string }) {
  const upper = (product || "").toUpperCase();
  const tagClass = upper.includes("EBMS")
    ? "bg-blue-100 text-blue-800"
    : upper.includes("HSD")
      ? "bg-emerald-100 text-emerald-800"
      : "bg-amber-100 text-amber-800";

  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", tagClass)}>
      {product}
    </span>
  );
}
