import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { processingService } from "@/lib/invoices/processing-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const { id: invoiceId } = await params;
  const body = await request.json();
  const { jobItemId, storagePath } = body;

  const supabase = await createServiceClient();
  await supabase.from("invoices").update({ status: "REPLACED" }).eq("id", invoiceId);

  const result = await processingService.processItem(jobItemId, storagePath, invoiceId);
  return NextResponse.json(result);
}
