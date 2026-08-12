import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const supabase = await createServiceClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id")
    .eq("status", "APPROVED");

  const invoiceIds = (invoices || []).map((i) => i.id);
  if (!invoiceIds.length) return NextResponse.json([]);

  const { data: lineItems } = await supabase
    .from("invoice_line_items")
    .select("product, output_quantity")
    .in("invoice_id", invoiceIds);

  const grouped: Record<string, number> = {};
  for (const item of lineItems || []) {
    const product = item.product || "Unknown";
    grouped[product] = (grouped[product] || 0) + (item.output_quantity || 0);
  }

  return NextResponse.json(
    Object.entries(grouped).map(([product, quantity]) => ({ product, quantity }))
  );
}
