import type { CardFeeConfig } from '@/types/database';

// --- Brand matching helpers (mirrors PaymentMethodDialog) ---
const normalizeBrand = (brand?: string | null) =>
  (brand || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const brandTokens = (brand?: string | null) =>
  normalizeBrand(brand)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

const brandMatches = (configuredBrand: string, selectedBrand: string) => {
  const configured = normalizeBrand(configuredBrand);
  const selected = normalizeBrand(selectedBrand);
  if (!configured || !selected) return false;
  if (configured === selected) return true;
  const configuredTokens = brandTokens(configured);
  const selectedTokens = brandTokens(selected);
  return configuredTokens.some(token => selectedTokens.includes(token));
};

const isFallbackBrand = (brand: string) => {
  const normalized = normalizeBrand(brand);
  return ['others', 'outras bandeiras', 'outros', 'outra bandeira'].includes(normalized);
};

export const findCardFeeConfig = (
  fees: CardFeeConfig[],
  selectedBrand: string,
  paymentType: string,
  installments: number,
): CardFeeConfig | null => {
  const samePaymentType = fees.filter(f => f.payment_type === paymentType);
  const sameBrand = samePaymentType.filter(f => brandMatches(f.brand, selectedBrand));
  const fallbackBrand = samePaymentType.filter(f => isFallbackBrand(f.brand));
  const candidates = sameBrand.length > 0 ? sameBrand : fallbackBrand;

  return (
    candidates.find(f => f.installments === installments) ||
    candidates.find(f => f.installments === 1) ||
    candidates
      .filter(f => typeof f.installments === 'number')
      .sort((a, b) => Math.abs((a.installments || 1) - installments) - Math.abs((b.installments || 1) - installments))[0] ||
    null
  );
};

/**
 * Resolve the card fee rate (and anticipation rate) for a chosen method.
 * Non-card methods (cash/pix) return 0. Mirrors the logic in PaymentMethodDialog.
 */
export function resolveCardFeeRate(opts: {
  fees: CardFeeConfig[];
  method: string;
  brand: string | null;
  installments: number;
  anticipate: boolean;
}): { cardFeeRate: number; anticipationRate: number } {
  const { fees, method, brand, installments, anticipate } = opts;
  if (method !== 'credit' && method !== 'debit') {
    return { cardFeeRate: 0, anticipationRate: 0 };
  }
  const lookupInstallments = method === 'debit' ? 1 : (installments || 1);
  const feeConfig = findCardFeeConfig(fees, brand || '', method, lookupInstallments);
  if (!feeConfig) return { cardFeeRate: 0, anticipationRate: 0 };

  const anticipationRate = feeConfig.anticipation_rate || 0;
  const cardFeeRate = anticipate && anticipationRate ? anticipationRate : feeConfig.rate;
  return { cardFeeRate, anticipationRate: anticipate ? anticipationRate : 0 };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Compute deduction amounts for a gross amount, given the rates.
 * Tax and location rates are method-independent; only the card fee rate
 * changes with the payment method. Matches the formula in PaymentMethodDialog.
 */
export function computeDeductions(opts: {
  amount: number;
  taxRate: number;
  cardFeeRate: number;
  locationRate: number;
}): { taxAmount: number; cardFeeAmount: number; locationAmount: number; netAmount: number } {
  const { amount, taxRate, cardFeeRate, locationRate } = opts;
  const taxAmount = round2((amount * taxRate) / 100);
  const cardFeeAmount = round2((amount * cardFeeRate) / 100);
  const locationAmount = round2(((amount - cardFeeAmount) * locationRate) / 100);
  const netAmount = round2(amount - taxAmount - cardFeeAmount - locationAmount);
  return { taxAmount, cardFeeAmount, locationAmount, netAmount };
}
