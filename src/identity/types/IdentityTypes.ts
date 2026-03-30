/**
 * Role enum — three roles with deliberately non-overlapping capabilities.
 *
 * USER     — can place bets, manage own wallet, view own history
 * VIP_USER — everything USER can do + higher rate limits + VIP-only markets
 * ADMIN    — cannot place bets (eliminates insider advantage from privileged
 *            event knowledge); can create/settle events, manage users, query audit log
 */
export enum Role {
  USER     = 'USER',
  VIP_USER = 'VIP_USER',
  ADMIN    = 'ADMIN',
}

/**
 * tier is embedded in the JWT payload so OpenResty can apply
 * per-tier rate limits at the edge without calling the Identity Service.
 */
export const ROLE_TIER: Record<Role, string> = {
  [Role.USER]:     'free',
  [Role.VIP_USER]: 'vip',
  [Role.ADMIN]:    'admin',
};

/**
 * Shape of the decoded JWT payload.
 * Attached to request.user by JwtAuthGuard.
 */
export interface JwtPayload {
  sub:  string; // user_id (UUID)
  role: Role;
  tier: string; // 'free' | 'vip' | 'admin'
  jti:  string; // unique per-token ID — stored in Redis blacklist on logout
  iat:  number;
  exp:  number;
}
