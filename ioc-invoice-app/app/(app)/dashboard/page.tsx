import { Suspense } from "react";
import { HomeHub } from "@/components/home/HomeHub";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-[10px]" />}>
      <HomeHub />
    </Suspense>
  );
}
