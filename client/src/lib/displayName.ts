/**
 * Get the display name for a user based on their preference
 */
export function getDisplayName(user: {
    firstName?: string;
    lastName?: string;
    username?: string | null;
    displayNamePreference?: 'username' | 'fullname';
    email?: string;
}): string {
    if (!user) return 'Unknown';

    const preference = user.displayNamePreference ?? 'fullname';
    const username = user.username ?? user.email?.split('@')[0] ?? 'user';
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();

    if (preference === 'username') {
        return `@${username}`;
    }

    return fullName || `@${username}`;
}

/**
 * Get the short display name (for tight spaces)
 */
export function getShortDisplayName(user: {
    firstName?: string;
    username?: string | null;
    displayNamePreference?: 'username' | 'fullname';
    email?: string;
}): string {
    if (!user) return 'Unknown';

    const preference = user.displayNamePreference ?? 'fullname';
    const username = user.username ?? user.email?.split('@')[0] ?? 'user';

    if (preference === 'username') {
        return `@${username}`;
    }

    return user.firstName || `@${username}`;
}
