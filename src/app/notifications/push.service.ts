import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
    actions?: Array<{
        action: string;
        title: string;
    }>;
}

@Injectable()
export class PushService {
    private readonly logger = new Logger(PushService.name);
    private readonly isConfigured: boolean;

    constructor(private readonly configService: ConfigService) {
        const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
        const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
        const subject = this.configService.get<string>('VAPID_SUBJECT') || 'mailto:hello@peertolearn.com';

        if (publicKey && privateKey) {
            webpush.setVapidDetails(subject, publicKey, privateKey);
            this.isConfigured = true;
            this.logger.log('Push notifications configured');
        } else {
            this.isConfigured = false;
            this.logger.warn('VAPID keys not configured - push notifications disabled');
        }
    }

    /**
     * Check if push notifications are configured
     */
    isEnabled(): boolean {
        return this.isConfigured;
    }

    /**
     * Get the public VAPID key (needed by frontend)
     */
    getPublicKey(): string | null {
        return this.configService.get<string>('VAPID_PUBLIC_KEY') || null;
    }

    /**
     * Send a push notification to a subscription
     */
    async sendNotification(
        subscription: PushSubscription,
        payload: PushNotificationPayload,
    ): Promise<boolean> {
        if (!this.isConfigured) {
            this.logger.debug('Push not configured, skipping notification');
            return false;
        }

        try {
            const payloadString = JSON.stringify(payload);
            await webpush.sendNotification(subscription, payloadString);
            this.logger.debug(`Push notification sent: ${payload.title}`);
            return true;
        } catch (error: any) {
            // 410 Gone or 404 means the subscription is no longer valid
            if (error.statusCode === 410 || error.statusCode === 404) {
                this.logger.warn('Push subscription expired or invalid');
                return false;
            }
            this.logger.error(`Push notification failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Send a nudge notification
     */
    async sendNudgeNotification(
        subscription: PushSubscription,
        senderName: string,
    ): Promise<boolean> {
        return this.sendNotification(subscription, {
            title: '⚡ Study Nudge!',
            body: `${senderName} sent you a study nudge!`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: { type: 'nudge', url: '/study-partner' },
        });
    }

    /**
     * Send a partner request accepted notification
     */
    async sendPartnerAcceptedNotification(
        subscription: PushSubscription,
        partnerName: string,
    ): Promise<boolean> {
        return this.sendNotification(subscription, {
            title: '🎉 Partner Request Accepted!',
            body: `${partnerName} accepted your partner request!`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: { type: 'partner_accepted', url: '/study-partner' },
        });
    }

    /**
     * Send a challenge invite notification
     */
    async sendChallengeNotification(
        subscription: PushSubscription,
        challengerName: string,
        materialId: string,
    ): Promise<boolean> {
        return this.sendNotification(subscription, {
            title: '⚔️ Quiz Challenge!',
            body: `${challengerName} challenged you to a quiz!`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: { type: 'challenge', url: '/study-partner', materialId },
            actions: [
                { action: 'accept', title: 'Accept' },
                { action: 'decline', title: 'Decline' },
            ],
        });
    }

    /**
     * Send a streak warning notification
     */
    async sendStreakWarningNotification(
        subscription: PushSubscription,
        currentStreak: number,
    ): Promise<boolean> {
        return this.sendNotification(subscription, {
            title: '🔥 Streak Alert!',
            body: `Your ${currentStreak}-day streak is about to break! Study now to keep it alive.`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: { type: 'streak_warning', url: '/dashboard' },
        });
    }

    /**
     * Send a partner invite notification
     */
    async sendPartnerInviteNotification(
        subscription: PushSubscription,
        senderName: string,
    ): Promise<boolean> {
        return this.sendNotification(subscription, {
            title: '👥 Partner Request',
            body: `${senderName} wants to be your study partner!`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            data: { type: 'partner_invite', url: '/study-partner' },
        });
    }
}
