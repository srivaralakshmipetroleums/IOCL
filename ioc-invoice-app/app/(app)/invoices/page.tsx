import { Suspense } from "react";
import { InvoicesHub } from "@/components/invoices/InvoicesHub";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[10px]" />}>
      <InvoicesHub />
    </Suspense>
  );
}
