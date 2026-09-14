"use client";
import { supabase } from "@/lib/supabase-browser";

const BUCKET = "menu-images";

function extensionOf(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/jpeg") return "jpg";
  return "webp";
}

/**
 * Uploads an image blob to Supabase Storage under the signed-in user's
 * folder. RLS enforces foldername[1] === auth.uid() server-side.
 * Returns the public URL of the stored object.
 */
export async function uploadImage(
  blob: Blob,
  folder: "logos" | "photos",
): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error("Yükleme için giriş yapmalısınız.");
  const path = `${folder}/${uid}/${crypto.randomUUID()}.${extensionOf(blob.type)}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error("Dosya adresi alınamadı.");
  return pub.publicUrl;
}