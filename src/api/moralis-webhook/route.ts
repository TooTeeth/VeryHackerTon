import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("📬 Received webhook from Moralis:", JSON.stringify(body, null, 2));

  // 여기에 Supabase 저장 로직 등을 추가할 수 있음

  return NextResponse.json({ received: true });
}
