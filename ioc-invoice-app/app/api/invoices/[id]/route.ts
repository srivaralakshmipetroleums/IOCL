import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { invoiceRepository } from "@/lib/invoices/invoice-repository";
import { processingService } from "@/lib/invoices/processing-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const { id } = await params;
  const invoice = await invoiceRepository.getById(id);
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(invoice);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const { id } = await params;
  const body = await request.json();

  const updated = await invoiceRepository.update(id, {
    ...body,
    status: body.status || "NEEDS_REVIEW",
  });

  if (body.line_items) {
    await invoiceRepository.updateLineItems(id, body.line_items);
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const { id } = await params;
  await invoiceRepository.delete(id);
  return NextResponse.json({ success: true });
}
