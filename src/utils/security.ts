/**
 * Security utility functions
 * These functions help protect sensitive data and prevent XSS attacks
 */
import DOMPurify from 'dompurify';

/**
 * Mask CPF for display - shows only last 2 digits
 * Input: "123.456.789-00" or "12345678900"
 * Output: "***.***.**9-00"
 */
export function maskCPF(cpf: string | null | undefined): string {
    if (!cpf) return '';

    // Remove non-numeric characters
    const numbers = cpf.replace(/\D/g, '');

    if (numbers.length !== 11) {
        // If invalid CPF, mask everything except last 2
        return cpf.replace(/./g, (char, index) => index < cpf.length - 2 ? '*' : char);
    }

    // Format as ***.***.**X-XX (show last 3 digits)
    return `***.***.**${numbers.slice(8, 9)}-${numbers.slice(9, 11)}`;
}

/**
 * Mask phone number for display
 * Input: "(11) 99999-9999"
 * Output: "(11) *****-9999"
 */
export function maskPhone(phone: string | null | undefined): string {
    if (!phone) return '';

    const numbers = phone.replace(/\D/g, '');

    if (numbers.length < 4) return phone;

    // Show only last 4 digits
    const lastFour = numbers.slice(-4);
    const maskedPart = '*'.repeat(numbers.length - 4);

    // Try to maintain original format
    if (phone.includes('(')) {
        const areaCode = numbers.slice(0, 2);
        return `(${areaCode}) ${'*'.repeat(5)}-${lastFour}`;
    }

    return maskedPart + lastFour;
}

/**
 * Sanitize text to prevent XSS attacks
 * Removes potentially dangerous HTML/script content
 */
export function sanitizeText(text: string | null | undefined): string {
    if (!text) return '';

    return text
        // Remove script tags and their content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove onclick and other event handlers
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '')
        // Escape HTML entities
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Sanitize text for display in React Native (simpler version)
 * Just removes dangerous patterns without HTML entity encoding
 */
export function sanitizeForDisplay(text: string | null | undefined): string {
    if (!text) return '';

    return text
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove javascript: URLs
        .replace(/javascript:/gi, '');
}

/**
 * Sanitize HTML using DOMPurify (robust XSS prevention)
 * Use this instead of regex-based sanitizeText for HTML content
 */
export function sanitizeHtml(html: string | null | undefined): string {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'span'],
        ALLOWED_ATTR: ['class'],
    });
}

/**
 * Check if text contains potentially dangerous content
 */
export function containsDangerousContent(text: string | null | undefined): boolean {
    if (!text) return false;

    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
    ];

    return dangerousPatterns.some(pattern => pattern.test(text));
}
