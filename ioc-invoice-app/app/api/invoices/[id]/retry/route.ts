import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { processingService } from "@/lib/invoices/processing-service";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const { id } = await params;
  await processingService.retryInvoice(id);
  return NextResponse.json({ success: true });
}
