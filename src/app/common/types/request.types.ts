import { Request } from 'express';
import { User } from '@/app/users/entities/user.entity';

/**
 * Express Request with authenticated user attached by Passport JWT strategy
 * Use this type for any controller endpoint that requires authentication
 */
export interface AuthenticatedRequest extends Request {
    user: User;
}

/**
 * Request with minimal user info (just id)
 * Use when you only need user.id and don't need the full User entity
 */
export interface AuthenticatedRequestMinimal extends Request {
    user: {
        id: string;
    };
}
