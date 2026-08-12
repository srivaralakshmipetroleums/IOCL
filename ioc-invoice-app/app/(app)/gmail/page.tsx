import { Suspense } from "react";
import { GmailPage } from "@/components/gmail/GmailPage";
import { Skeleton } from "@/components/ui/skeleton";

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <GmailPage />
    </Suspense>
  );
}
