import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getAccessibleUrl(url: string | null): Promise<string | null> {
  if (!url) return null;

  // Storage path (not a full URL) — e.g. "documents/clinic123/signed_xxx.pdf" or "clinicId/doc_xxx.pdf"
  // These are stored by webhook/services and need a signed URL generated on the fly
  if (!url.startsWith('http') && !url.startsWith('//')) {
    try {
      const { data, error } = await supabase
        .storage
        .from('exams')
        .createSignedUrl(url, 3600); // 1 hour expiry

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

  // Check if it's a Supabase Storage URL
  if (url.includes('/storage/v1/object/public/')) {
    try {
      // Extract bucket and path
      // Format: .../storage/v1/object/public/[bucket]/[path]
      const parts = url.split('/storage/v1/object/public/');
      if (parts.length < 2) return url;

      const pathParts = parts[1].split('/');
      const bucket = pathParts[0];
      const filePath = decodeURIComponent(pathParts.slice(1).join('/'));

      if (!bucket || !filePath) return url;

      // Try to get a signed URL
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

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

  return url;
}
