/**
 * Canonical formatting utilities for the application.
 * Use these instead of defining local formatCurrency/formatPhone/formatCPF.
 */

/** Format a number as Brazilian Real (R$ 1.234,56) */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Format a number as decimal with 2 fraction digits (1.234,56) — no currency symbol */
export function formatDecimal(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0,00';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format a phone string as (XX) XXXXX-XXXX or international +XX XXXXXXXXX */
export function formatPhone(value: string): string {
  // International format: starts with +
  if (value.startsWith('+')) {
    const cleaned = '+' + value.slice(1).replace(/[^\d]/g, '').slice(0, 15);
    return cleaned;
  }
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Get WhatsApp-ready phone number: international numbers keep their code, Brazilian numbers get +55 */
export function getWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) return digits;
  return `55${digits}`;
}

/** Format a Date as local YYYY-MM-DD string (avoids UTC offset issues from toISOString) */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a CPF string as XXX.XXX.XXX-XX */
export function formatCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
