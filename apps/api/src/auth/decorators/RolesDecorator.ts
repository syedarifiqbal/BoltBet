import { SetMetadata } from '@nestjs/common';
import { Role } from '../../identity/types/IdentityTypes';

/**
 * Declare which roles are allowed to call a route.
 * RolesGuard reads this metadata and compares against request.user.role.
 *
 * Role checks answer: "is this type of user allowed to use this feature?"
 * Query scoping (WHERE user_id = :userId) answers: "is this user allowed to
 * see this specific record?" Never conflate the two.
 *
 * Usage:
 *   @Roles(Role.ADMIN)
 *   @Get('admin/users')
 *   listUsers() {}
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
