/**
 * Role configuration for the clinic system
 * Database values: owner, admin, dentist, assistant, editor, viewer
 * Display names in Portuguese
 */

export type ClinicRole = 'owner' | 'admin' | 'dentist' | 'assistant' | 'editor' | 'viewer';

export const ROLE_LABELS: Record<ClinicRole, string> = {
    owner: 'Dono',
    admin: 'Administrador',
    dentist: 'Dentista',
    assistant: 'Secretaria',
    editor: 'Editor',
    viewer: 'Visualizador',
};

export const ROLE_DESCRIPTIONS: Record<ClinicRole, string> = {
    owner: 'Proprietario da clinica',
    admin: 'Acesso total ao sistema',
    dentist: 'Acesso a pacientes e agenda',
    assistant: 'Acesso administrativo',
    editor: 'Pode criar e editar dados',
    viewer: 'Apenas visualizacao',
};

/** Normalize role input to array */
function toArray(role: string | string[]): string[] {
    return Array.isArray(role) ? role : [role];
}

/**
 * Check if role can see all financial transactions
 * Only owners, admins, and managers can see clinic-wide financials
 */
export const canSeeAllFinancials = (role: string | string[]): boolean => {
    const roles = toArray(role);
    return roles.some(r => ['owner', 'admin', 'manager'].includes(r));
};

/**
 * Check if role has admin-level permissions
 */
export const isAdminRole = (role: string | string[]): boolean => {
    const roles = toArray(role);
    return roles.some(r => ['owner', 'admin'].includes(r));
};

/**
 * Check if role can act as a dentist (attend patients, manage appointments)
 * Owners, admins, and dentists can all act as clinical professionals
 */
export const canActAsDentist = (role: string | string[]): boolean => {
    const roles = toArray(role);
    return roles.some(r => ['owner', 'admin', 'dentist'].includes(r));
};

/**
 * Get display label for a role
 */
export const getRoleLabel = (role: string): string => {
    return ROLE_LABELS[role as ClinicRole] || role;
};

/**
 * Get combined display label for multiple roles
 */
export const getRolesLabel = (roles: string[]): string => {
    if (roles.length === 0) return '';
    return roles.map(r => ROLE_LABELS[r as ClinicRole] || r).join(', ');
};
