/**
 * ShiftOps RBAC Middleware — enforces role-based access on API routes.
 * Uses authenticate() from auth.ts to get the current user,
 * then checks role permissions per resource/action.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticate, SessionUser, requireRoles } from './auth'

// ─── Permission Definitions ────────────────────────────────────────────────────
// Admin: all actions
// Manager: location-scoped CRUD + AI preview/apply
// Member: read-only self scope

export type Action =
  | 'staff:read' | 'staff:create' | 'staff:update' | 'staff:delete'
  | 'shift-type:read' | 'shift-type:create' | 'shift-type:update' | 'shift-type:delete'
  | 'ai:preview' | 'ai:apply' | 'ai:rollback'
  | 'assignment:read' | 'assignment:write'
  | 'swap:read' | 'swap:approve'
  | 'overtime:read' | 'overtime:confirm'
  | 'audit:read'
  | 'export:read' | 'export:create'

const PERMISSIONS: Record<string, Action[]> = {
  ADMIN: [
    'staff:read', 'staff:create', 'staff:update', 'staff:delete',
    'shift-type:read', 'shift-type:create', 'shift-type:update', 'shift-type:delete',
    'ai:preview', 'ai:apply', 'ai:rollback',
    'assignment:read', 'assignment:write',
    'swap:read', 'swap:approve',
    'overtime:read', 'overtime:confirm',
    'audit:read',
    'export:read', 'export:create',
  ],
  MANAGER: [
    'staff:read', 'staff:create', 'staff:update', // delete: own location only
    'shift-type:read', 'shift-type:create', 'shift-type:update',
    'ai:preview', 'ai:apply', 'ai:rollback',
    'assignment:read', 'assignment:write',
    'swap:read', 'swap:approve',
    'overtime:read', 'overtime:confirm',
    'export:read', 'export:create',
  ],
  MEMBER: [
    'staff:read', // own profile only (enforced at handler level)
    'ai:preview', // self/swap scope only
    'assignment:read', // own only
    'swap:read',
    'export:read', // self schedule only
  ],
}

function can(user: SessionUser, action: Action): boolean {
  return PERMISSIONS[user.role]?.includes(action) ?? false
}

/**
 * Middleware wrapper: authenticate + check permission.
 * Usage in route handler:
 *   const auth = await requireAuth(req, 'staff:create')
 *   if (auth.error) return auth.error
 *   const { user } = auth
 */
export async function requireAuth(
  req: NextRequest,
  action: Action
): Promise<{ user: SessionUser; error: null } | { user: null; error: NextResponse }> {
  const auth = await authenticate(req)
  if (auth.error) return { user: null, error: auth.error }

  if (!auth.user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Missing session user' } },
        { status: 401 }
      )
    }
  }

  if (!can(auth.user, action)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: { code: 'FORBIDDEN', message: `Action '${action}' not permitted for role '${auth.user.role}'` } },
        { status: 403 }
      )
    }
  }

  return { user: auth.user, error: null }
}

/**
 * Check if user can access a specific location (location-scoped).
 * ADMIN can access any location.
 * MANAGER can only access their own location.
 * MEMBER has no location-level access (handled separately).
 */
export function canAccessLocation(user: SessionUser, locationId: string): boolean {
  if (user.role === 'ADMIN') return true
  if (user.role === 'MANAGER') return user.locationId === locationId
  return false
}

/**
 * For MEMBER scope: verify the target resource belongs to the user.
 */
export function isOwnResource(user: SessionUser, resourceStaffId: string): boolean {
  return user.id === resourceStaffId || user.role !== 'MEMBER'
}

// Re-export SessionUser and Role for convenience
export type { SessionUser }
export { authenticate, requireRoles }
