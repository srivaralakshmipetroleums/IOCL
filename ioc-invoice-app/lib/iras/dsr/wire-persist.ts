import type { SupabaseClient } from "@supabase/supabase-js";
import { getIrasDsrCaptureManager } from "@/lib/iras/dsr/capture-manager";
import { persistDsrCapture } from "@/lib/iras/dsr/repository";

export function wireDsrCapturePersist(supabase: SupabaseClient): void {
  getIrasDsrCaptureManager().setOnCaptureSuccess(async (rawResponse, meta) =>
    persistDsrCapture(supabase, rawResponse, meta)
  );
}
