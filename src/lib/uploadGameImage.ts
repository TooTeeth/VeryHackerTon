import { supabase } from "./supabaseClient";

export async function uploadGameImage(file: File): Promise<string | null> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage.from("game-images").upload(`games/${fileName}`, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    console.error("Image Upload Failed:", error);
    return null;
  }

  const { data } = supabase.storage.from("game-images").getPublicUrl(`games/${fileName}`);
  if (error || !data?.publicUrl) {
    console.error("Public URL create Failed:", error);
    return null;
  }

  return data?.publicUrl ?? null;
}
