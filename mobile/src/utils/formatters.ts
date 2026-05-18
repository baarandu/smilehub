/** Get WhatsApp-ready phone number: international numbers keep their code, Brazilian numbers get +55 */
export function getWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return digits;
  return `55${digits}`;
}

/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC drift from toISOString) */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
