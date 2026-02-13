/**
 * Validation Schemas using Zod
 * These schemas are used to validate input data before sending to the backend
 * 
 * SAFE MODE: By default, validation only logs warnings instead of blocking
 * Set STRICT_VALIDATION to true when ready to enforce validation
 */

import { z } from 'zod';

// Configuration
const STRICT_VALIDATION = true; // ✅ Validation enforced - invalid data will be blocked

// Helper: Validate and return result (doesn't throw)
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: string[];
} {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);

    // Log warning in development
    if (process.env.NODE_ENV !== 'production') {
        console.warn('[Validation Warning]', errors);
    }

    // In safe mode, return original data with warning
    if (!STRICT_VALIDATION) {
        return { success: true, data: data as T, errors };
    }

    return { success: false, errors };
}

// =====================================================
// CPF Validation
// =====================================================
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;

export const cpfSchema = z.string()
    .refine(val => !val || cpfRegex.test(val), {
        message: 'CPF deve ter o formato 000.000.000-00 ou 00000000000'
    })
    .optional()
    .nullable();

// =====================================================
// Phone Validation (Brazilian format)
// =====================================================
const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$|^\d{10,11}$/;

export const phoneSchema = z.string()
    .refine(val => !val || phoneRegex.test(val.replace(/\s/g, '')), {
        message: 'Telefone deve ter formato (11) 99999-9999'
    });

// =====================================================
// Email Validation
// =====================================================
export const emailSchema = z.string()
    .email({ message: 'Email inválido' })
    .optional()
    .nullable()
    .or(z.literal(''));

// =====================================================
// Date Validation
// =====================================================
export const dateSchema = z.string()
    .refine(val => !val || !isNaN(Date.parse(val)), {
        message: 'Data inválida'
    })
    .optional()
    .nullable();

// =====================================================
// Patient Schema
// =====================================================
export const patientSchema = z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    phone: phoneSchema,
    email: emailSchema,
    cpf: cpfSchema,
    birth_date: dateSchema,
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().max(2, 'UF deve ter 2 caracteres').optional().nullable(),
    zip_code: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

// =====================================================
// Financial Transaction Schema
// =====================================================
export const financialTransactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive('Valor deve ser maior que zero'),
    description: z.string().min(1, 'Descrição é obrigatória'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    date: z.string(),
    is_fixed: z.boolean().optional(),
});

// =====================================================
// Budget Item Schema
// =====================================================
export const budgetItemSchema = z.object({
    tooth: z.string(),
    treatments: z.array(z.string()).min(1, 'Selecione pelo menos um tratamento'),
    values: z.record(z.string(), z.number()),
});

// =====================================================
// Anamnese Schema
// =====================================================
export const anamneseSchema = z.object({
    patient_id: z.string().uuid(),
    notes: z.string().optional().nullable(),
    has_health_issues: z.boolean().optional(),
    is_pregnant: z.boolean().optional(),
    has_allergies: z.boolean().optional(),
    uses_medication: z.boolean().optional(),
    had_surgery: z.boolean().optional(),
    has_heart_problems: z.boolean().optional(),
    has_diabetes: z.boolean().optional(),
    has_blood_pressure: z.boolean().optional(),
});

// =====================================================
// PIX Key Validation
// =====================================================
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;
const pixPhoneRegex = /^\+55\d{10,11}$|^\d{10,11}$/;
const pixRandomKeyRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function validatePixKey(key: string, type: string): { valid: boolean; error?: string } {
    if (!key || key.trim() === '') {
        return { valid: false, error: 'Chave PIX é obrigatória' };
    }

    const cleanKey = key.trim();

    switch (type) {
        case 'cpf':
            if (!cpfRegex.test(cleanKey)) {
                return { valid: false, error: 'CPF inválido. Use formato 000.000.000-00' };
            }
            break;
        case 'cnpj':
            if (!cnpjRegex.test(cleanKey)) {
                return { valid: false, error: 'CNPJ inválido. Use formato 00.000.000/0001-00' };
            }
            break;
        case 'email':
            const emailResult = z.string().email().safeParse(cleanKey);
            if (!emailResult.success) {
                return { valid: false, error: 'E-mail inválido' };
            }
            break;
        case 'phone':
            if (!pixPhoneRegex.test(cleanKey.replace(/\D/g, ''))) {
                return { valid: false, error: 'Telefone inválido. Use formato +5511999999999' };
            }
            break;
        case 'random':
            if (!pixRandomKeyRegex.test(cleanKey) && cleanKey.length < 10) {
                return { valid: false, error: 'Chave aleatória inválida' };
            }
            break;
    }

    return { valid: true };
}

// =====================================================
// Password Validation
// =====================================================
export const passwordSchema = z.string()
    .min(12, 'Senha deve ter pelo menos 12 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos um caractere especial');

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): { strength: PasswordStrength; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= 12) score++;
    else feedback.push('Mínimo 12 caracteres');

    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Letra maiúscula');

    if (/[a-z]/.test(password)) score++;
    else feedback.push('Letra minúscula');

    if (/[0-9]/.test(password)) score++;
    else feedback.push('Número');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else feedback.push('Caractere especial (!@#$...)');

    const strength: PasswordStrength = score <= 2 ? 'weak' : score <= 4 ? 'medium' : 'strong';
    return { strength, score, feedback };
}

// =====================================================
// Export validation helper
// =====================================================
export type PatientData = z.infer<typeof patientSchema>;
export type FinancialData = z.infer<typeof financialTransactionSchema>;
export type AnamneseData = z.infer<typeof anamneseSchema>;
