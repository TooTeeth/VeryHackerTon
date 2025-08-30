import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export async function PATCH(req: NextRequest) {
  const { walletAddress, vtdnToSpend } = await req.json();

  if (!walletAddress || !vtdnToSpend) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const walletAddressNormalized = walletAddress.toLowerCase();

  const { data: user, error: userError } = await supabase.from("Users").select("id").eq("wallet_address", walletAddressNormalized).single();

  //user check
  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: vtdn, error: vtdnError } = await supabase.from("vtdn").select("vtdn_balance").eq("user_id", user.id).single();

  //vtdn user check
  if (vtdnError || !vtdn) {
    return NextResponse.json({ error: "VTDN not found" }, { status: 404 });
  }
  const currentBalance = parseFloat(vtdn.vtdn_balance);
  const toSpend = parseFloat(vtdnToSpend);

  //vtdn balance swap
  if (currentBalance < toSpend) {
    return NextResponse.json({ error: "Insufficient VTDN" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("vtdn")
    .update({ vtdn_balance: currentBalance - toSpend })
    .eq("user_id", user.id);

  //update vtdn
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
