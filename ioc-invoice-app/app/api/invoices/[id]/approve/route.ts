import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { invoiceRepository } from "@/lib/invoices/invoice-repository";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const { id } = await params;
  const invoice = await invoiceRepository.approve(id);
  return NextResponse.json(invoice);
}
