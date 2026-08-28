"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GmailPage } from "@/components/gmail/GmailPage";
import { InvoiceListPage } from "@/components/invoices/InvoiceListPage";
import { HubTabBar } from "@/components/layout/HubTabBar";
import { PageTitle } from "@/components/layout/PageTitle";
import { UploadPage } from "@/components/upload/UploadPage";

type InvoicesTab = "list" | "upload" | "gmail";

const INVOICE_TABS = [
  { id: "list", label: "List" },
  { id: "upload", label: "Upload" },
  { id: "gmail", label: "Gmail" },
] as const;

function isInvoicesTab(value: string | null): value is InvoicesTab {
  return value === "list" || value === "upload" || value === "gmail";
}

export function InvoicesHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab: InvoicesTab = isInvoicesTab(tabParam) ? tabParam : "list";

  const setTab = useCallback(
    (next: InvoicesTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>Invoices</PageTitle>
        <p className="mt-1 text-sm text-ioc-muted">Search, upload PDFs, or fetch from Gmail.</p>
      </div>

      <HubTabBar tabs={[...INVOICE_TABS]} active={tab} onChange={(id) => setTab(id as InvoicesTab)} />

      {tab === "list" && <InvoiceListPage embedded />}
      {tab === "upload" && <UploadPage embedded />}
      {tab === "gmail" && <GmailPage embedded />}
    </div>
  );
}
