/**
 * Server-side super-admin enforcement for Edge Functions.
 *
 * Uses the `is_super_admin()` SECURITY DEFINER RPC introduced in
 * migration 20260414_prevent_super_admin_escalation.sql. Callers should
 * pass a client bound to the user's JWT, not the service role.
 */

export class NotSuperAdminError extends Error {
  public readonly statusCode = 403;
  constructor(message = "Apenas super administradores podem executar esta ação.") {
    super(message);
    this.name = "NotSuperAdminError";
  }
}

export async function isSuperAdmin(userScopedSupabase: any): Promise<boolean> {
  const { data, error } = await userScopedSupabase.rpc("is_super_admin");
  if (error) return false;
  return data === true;
}

export async function requireSuperAdmin(userScopedSupabase: any): Promise<void> {
  const ok = await isSuperAdmin(userScopedSupabase);
  if (!ok) throw new NotSuperAdminError();
}
