import { notFound } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default async function StreamPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const decodedSlug = decodeURIComponent(slug);

  console.log("slug:", slug);
  console.log("decodedSlug:", decodedSlug);

  const { data: game, error } = await supabase.from("Stream").select("*").eq("Title", decodedSlug).single();

  console.log("game:", game);
  console.log("error:", error);

  if (!game || error) return notFound();

  return (
    <div className="text-black p-10">
      <h1 className="text-3xl font-bold">{game.Title}</h1>
      <p>Players: {game.Players}</p>
      <p>Genre: {game.Genre}</p>
      <p>Era: {game.Era}</p>
      <p>Plan: {game.Plan === 0 ? "Free" : game.Plan}</p>
    </div>
  );
}
