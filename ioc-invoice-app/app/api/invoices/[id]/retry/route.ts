import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { processingService } from "@/lib/invoices/processing-service";
import { resolveExtractorMode } from "@/lib/extraction/get-extractor";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json().catch(() => ({}));
  const { id: invoiceId } = await params;
  const extractorMode = resolveExtractorMode(body.extractorMode);

  await processingService.retryInvoice(invoiceId, extractorMode);
  return NextResponse.json({ success: true, extractorMode });
}
