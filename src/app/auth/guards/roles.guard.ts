import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * RolesGuard
 * 
 * Enforces the @Role() decorator by checking if the authenticated user
 * has the required role to access the endpoint.
 * 
 * Usage:
 * - Apply @Role('admin') decorator to controller or method
 * - This guard reads that metadata and verifies user.role matches
 * 
 * Must be used AFTER AuthGuard('jwt') to ensure user is attached to request.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Get the required role from decorator metadata
        // Check both method-level and class-level decorators
        const requiredRole = this.reflector.getAllAndOverride<string>('ROLE', [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no role is required, allow access
        if (!requiredRole) {
            return true;
        }

        // Special case: 'any' means any authenticated user
        if (requiredRole === 'any') {
            return true;
        }

        // Get the user from the request (attached by JwtStrategy)
        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // Ensure user exists and has a role
        if (!user || !user.role) {
            throw new ForbiddenException('Access denied: User role not found');
        }

        // Check if user has the required role
        if (user.role !== requiredRole) {
            throw new ForbiddenException(`Access denied: ${requiredRole} role required`);
        }

        return true;
    }
}
