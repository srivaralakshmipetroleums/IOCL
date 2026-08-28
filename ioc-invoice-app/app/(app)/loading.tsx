import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48 rounded-[10px]" />
      <Skeleton className="h-12 w-full max-w-xl rounded-[10px]" />
      <Skeleton className="h-72 w-full rounded-[10px]" />
      <Skeleton className="h-48 w-full rounded-[10px]" />
    </div>
  );
}
