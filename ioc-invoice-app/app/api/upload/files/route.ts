import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { processingService } from "@/lib/invoices/processing-service";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { user, response } = await requireAuth();
  if (!user) return response!;

  const body = await request.json();
  const { jobId, filenames } = body as { jobId: string; filenames: string[] };

  const supabase = await createServiceClient();
  const items: Array<{ itemId: string; filename: string; uploadPath: string }> = [];

  for (const filename of filenames) {
    const itemId = await processingService.addJobItem(jobId, filename);
    const invoiceId = crypto.randomUUID();
    const now = new Date();
    const uploadPath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${invoiceId}.pdf`;

    await processingService.updateJobItem(itemId, {
      storage_path: uploadPath,
      status: "UPLOADING",
    });

    items.push({ itemId, filename, uploadPath });
  }

  return NextResponse.json({ items });
}
