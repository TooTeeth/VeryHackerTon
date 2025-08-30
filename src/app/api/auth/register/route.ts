import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
    }

    // 이미 등록된 유저인지 확인
    const { data: existingUser, error: selectError } = await supabase.from("Users").select("*").eq("wallet_address", walletAddress).single();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116은 no rows 에러임, 무시 가능
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    if (existingUser) {
      // 이미 있으면 그냥 유저 정보 리턴
      return NextResponse.json({ user: existingUser });
    }

    // Register Users
    const { data: newUser, error: insertError } = await supabase
      .from("Users")
      .insert([{ wallet_address: walletAddress }])
      .select("id")
      .single();

    if (insertError) {
      console.error("🔴 insertError:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // vtdn tabla initailize create
    const { error: vtdnError } = await supabase.from("vtdn").insert([{ user_id: newUser.id, vtdn_balance: 0 }]);

    if (vtdnError) {
      console.error("🔴 vtdnError:", vtdnError);
      return NextResponse.json({ error: vtdnError.message }, { status: 500 });
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("🔴 unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
