import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const { id } = await params;
  const supabase = await createServiceClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("pdf_storage_path")
    .eq("id", id)
    .single();

  if (!invoice?.pdf_storage_path) {
    return NextResponse.json({ error: "No PDF found" }, { status: 404 });
  }

  const { data, error } = await supabase.storage
    .from("invoice-pdfs")
    .createSignedUrl(invoice.pdf_storage_path, 3600);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }

  return NextResponse.json({ url: data.signedUrl });
}
