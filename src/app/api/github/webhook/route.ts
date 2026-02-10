import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/github/webhooks";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";

  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
