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

/**
 * Check if role can see all financial transactions
 * Only owners, admins, and managers can see clinic-wide financials
 */
export const canSeeAllFinancials = (role: string): boolean => {
    return ['owner', 'admin', 'manager'].includes(role);
};

/**
 * Check if role has admin-level permissions
 */
export const isAdminRole = (role: string): boolean => {
    return ['owner', 'admin'].includes(role);
};

/**
 * Get display label for a role
 */
export const getRoleLabel = (role: string): string => {
    return ROLE_LABELS[role as ClinicRole] || role;
};
