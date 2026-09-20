import { NextResponse } from "next/server";
import { getXlmPrice } from "@/lib/xlm-price";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getXlmPrice(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { error: "XLM kuru şu an alınamıyor." },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
}
