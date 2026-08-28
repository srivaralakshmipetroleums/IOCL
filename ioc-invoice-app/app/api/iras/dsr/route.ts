import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require-auth";
import { getStoredDsrData } from "@/lib/iras/dsr/repository";
import type { IrasDsrProduct } from "@/lib/iras/dsr/types";

function parseQueryProduct(value: string | null): IrasDsrProduct | undefined {
  if (value === "MS" || value === "HSD") return value;
  return undefined;
}

function parseQueryNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const { user, response, supabase } = await requireAuth();
  if (!user) return response!;

  const { searchParams } = new URL(request.url);
  const month = parseQueryNumber(searchParams.get("month"));
  const year = parseQueryNumber(searchParams.get("year"));
  const product = parseQueryProduct(searchParams.get("product"));

  try {
    const data = await getStoredDsrData(supabase!, { month, year, product });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load stored DSR data" },
      { status: 500 }
    );
  }
}
