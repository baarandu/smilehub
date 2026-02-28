/**
 * Validação de inputs para Edge Functions
 * Previne inputs malformados, oversized ou inválidos
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUUID(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} inválido.`);
  }
  return value;
}

export function validateMaxLength(
  value: unknown,
  maxLength: number,
  fieldName: string
): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} deve ser texto.`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(
      `${fieldName} excede o limite de ${maxLength} caracteres.`
    );
  }
  return value;
}

export function validateRequired(value: unknown, fieldName: string): string {
  if (!value || (typeof value === "string" && value.trim().length === 0)) {
    throw new ValidationError(`${fieldName} é obrigatório.`);
  }
  return value as string;
}

export function validateImageUrls(urls: unknown): string[] {
  if (!urls) return [];
  if (!Array.isArray(urls)) {
    throw new ValidationError("image_urls deve ser um array.");
  }
  if (urls.length > 5) {
    throw new ValidationError("Máximo de 5 imagens por mensagem.");
  }
  for (const url of urls) {
    if (typeof url !== "string" || !url.startsWith("https://")) {
      throw new ValidationError("URLs de imagem devem usar HTTPS.");
    }
    if (url.length > 2048) {
      throw new ValidationError("URL de imagem muito longa.");
    }
  }
  return urls;
}

export function extractBearerToken(authHeader: string | null): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ValidationError("Token de autenticação ausente ou inválido.");
  }
  const token = authHeader.slice(7);
  if (token.length < 10) {
    throw new ValidationError("Token de autenticação inválido.");
  }
  return token;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_REGEX = /^\+?\d[\d\s()-]{7,19}$/;

export function validateEmail(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || !EMAIL_REGEX.test(value.trim())) {
    throw new ValidationError(`${fieldName} deve ser um e-mail válido.`);
  }
  return value.trim();
}

export function validatePhone(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} deve ser texto.`);
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15 || !PHONE_REGEX.test(value)) {
    throw new ValidationError(`${fieldName} deve ser um telefone válido.`);
  }
  return value;
}

export function validateNumericAmount(
  value: unknown,
  fieldName: string,
  { min = 0, max = 99_999_99 }: { min?: number; max?: number } = {}
): number {
  const num = typeof value === "string" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num) || num < min || num > max) {
    throw new ValidationError(`${fieldName} deve ser um valor numérico entre ${min} e ${max}.`);
  }
  return num;
}

export function sanitizeSearchTerm(term: string, maxLength = 100): string {
  if (!term || term.length < 2) {
    throw new ValidationError("Termo de busca deve ter pelo menos 2 caracteres.");
  }
  if (term.length > maxLength) {
    throw new ValidationError(`Termo de busca excede ${maxLength} caracteres.`);
  }
  // Escape SQL wildcard characters to prevent performance attacks
  return term.replace(/[%_]/g, "\\$&");
}

/**
 * Custom error class for validation errors.
 * Used to distinguish validation errors (400) from internal errors (500).
 */
export class ValidationError extends Error {
  public readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
