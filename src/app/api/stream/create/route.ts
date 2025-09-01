import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { Players, Creator, Title, Era, Genre, Plan, publicImageUrl } = body;

  //Create Stream
  const { data, error } = await supabase.from("Stream").insert([
    {
      Title,
      Players,
      Genre,
      Era,
      Plan,
      Creator,
      Image: publicImageUrl,
    },
  ]);

  if (error) {
    console.error("Stream Create Failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, Stream: data }, { status: 201 });
}
