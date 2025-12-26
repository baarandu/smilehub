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
// Export validation helper
// =====================================================
export type PatientData = z.infer<typeof patientSchema>;
export type FinancialData = z.infer<typeof financialTransactionSchema>;
export type AnamneseData = z.infer<typeof anamneseSchema>;
