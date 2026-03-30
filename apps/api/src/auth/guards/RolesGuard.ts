import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/RolesDecorator';
import type { Role, JwtPayload } from '../../identity/types/IdentityTypes';

/**
 * Applied globally via APP_GUARD in AuthModule, after JwtAuthGuard.
 *
 * Checks request.user.role (set by JwtAuthGuard) against @Roles() metadata.
 * If a route has no @Roles() decorator, all authenticated users can access it.
 *
 * Role checks are coarse-grained ("can this user type use this feature?").
 * Fine-grained ownership checks ("can this user see this record?") are done
 * in service methods via query scoping (WHERE user_id = :userId from JWT).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;

    const user = context.switchToHttp().getRequest<{ user?: JwtPayload }>().user;
    if (!user) return false;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
