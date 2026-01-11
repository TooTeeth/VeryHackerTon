import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase env variables are missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await request.json();
    const { Players, Creator, Title, Era, Genre, Plan, publicImageUrl } = body;

    const { data, error } = await supabase
      .from("Stream")
      .insert([
        {
          Title,
          Players,
          Genre,
          Era,
          Plan,
          Creator,
          Image: publicImageUrl,
        },
      ])
      .select();

    if (error) {
      console.error("Stream Create Failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && data.length > 0 && Creator) {
      const streamId = data[0].id;
      const gameId = `stream_${streamId}`;

      await supabase.from("game_operators").insert({
        game_id: gameId,
        wallet_address: Creator.toLowerCase(),
        role: "creator",
      });
    }

    return NextResponse.json({ success: true, Stream: data }, { status: 201 });
  } catch (error) {
    console.error("🔴 unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
