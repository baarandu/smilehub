/**
 * Compute SHA-256 hash of a PDF ArrayBuffer.
 * Uses the native Web Crypto API — no external dependencies.
 */
export async function computePdfHash(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', pdfArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique document ID for PDF traceability.
 */
export function generateDocumentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `DOC-${timestamp}-${random}`.toUpperCase();
}
