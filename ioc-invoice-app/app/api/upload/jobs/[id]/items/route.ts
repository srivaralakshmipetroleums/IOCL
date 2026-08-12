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

  const { data: items, error } = await supabase
    .from("processing_job_items")
    .select("*")
    .eq("job_id", id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { itemId, status } = body;

  const supabase = await createServiceClient();
  const { error } = await supabase
    .from("processing_job_items")
    .update({ status })
    .eq("id", itemId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
