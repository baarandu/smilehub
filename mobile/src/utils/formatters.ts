/** Get WhatsApp-ready phone number: international numbers keep their code, Brazilian numbers get +55 */
export function getWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return digits;
  return `55${digits}`;
}
