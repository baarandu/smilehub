import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a storage path or Supabase URL into a fresh signed URL (1h expiry).
 *
 * Handles three input formats:
 *  1. Pure storage path (e.g. "clinicId/file.jpg") — uses `bucket` param (default: "exams")
 *  2. Public URL (.../storage/v1/object/public/[bucket]/[path]) — extracts bucket from URL
 *  3. Signed URL (.../storage/v1/object/sign/[bucket]/[path]?token=...) — re-signs with fresh token
 *  4. External URL — returned as-is
 */
export async function getAccessibleUrl(url: string | null, bucket = 'exams'): Promise<string | null> {
  if (!url) return null;

  // Pure storage path (not a URL)
  if (!url.startsWith('http') && !url.startsWith('//')) {
    try {
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(url, 3600);

      if (error || !data?.signedUrl) {
        console.warn('Error creating signed URL from path:', error);
        return null;
      }

      return data.signedUrl;
    } catch (e) {
      console.error('Error generating signed URL:', e);
      return null;
    }
  }

  // Supabase Storage URL (public or signed)
  // Matches: /storage/v1/object/public/[bucket]/[path] OR /storage/v1/object/sign/[bucket]/[path]?...
  const storageMatch = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (storageMatch) {
    try {
      const extractedBucket = storageMatch[1];
      const filePath = decodeURIComponent(storageMatch[2]);

      if (!extractedBucket || !filePath) return url;

      const { data, error } = await supabase
        .storage
        .from(extractedBucket)
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        console.warn('Error creating signed URL:', error);
        return url;
      }

      return data.signedUrl;
    } catch (e) {
      console.error('Error parsing storage URL:', e);
      return url;
    }
  }

  // External URL — return unchanged
  return url;
}
