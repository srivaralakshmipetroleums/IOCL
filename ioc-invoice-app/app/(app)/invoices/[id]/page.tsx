"use client";

import { InvoiceDetailPage } from "@/components/invoices/InvoiceDetailPage";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <InvoiceDetailPage params={params} />;
}
