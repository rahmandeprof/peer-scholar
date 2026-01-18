import api from './api';

// VAPID public key - should match backend
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
    return (
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

/**
 * Check if push notifications are already enabled
 */
export async function isPushEnabled(): Promise<boolean> {
    if (!isPushSupported()) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
}

/**
 * Convert a base64 string to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return 'denied';
    }

    return Notification.requestPermission();
}

/**
 * Subscribe to push notifications and save to backend
 */
export async function subscribeToPush(): Promise<boolean> {
    if (!isPushSupported()) {
        console.warn('Push notifications not supported');
        return false;
    }

    if (!VAPID_PUBLIC_KEY) {
        console.warn('VAPID public key not configured');
        return false;
    }

    try {
        // Request permission first
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            console.log('Notification permission denied');
            return false;
        }

        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        // If no subscription, create one
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        }

        // Send subscription to backend
        const subscriptionJson = subscription.toJSON();
        await api.post('/users/push-subscription', {
            endpoint: subscriptionJson.endpoint,
            keys: subscriptionJson.keys,
        });

        console.log('Push notification subscription saved');
        return true;
    } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return false;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    if (!isPushSupported()) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();
            await api.delete('/users/push-subscription');
        }

        return true;
    } catch (error) {
        console.error('Failed to unsubscribe from push:', error);
        return false;
    }
}
