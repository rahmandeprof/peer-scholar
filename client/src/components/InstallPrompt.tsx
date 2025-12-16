import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed or dismissed
        const dismissed = localStorage.getItem('pwa-prompt-dismissed');
        if (dismissed) return;

        // Check if on iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        // Check if already installed as PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        if (isStandalone) return;

        // For non-iOS, listen for beforeinstallprompt
        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Delay showing prompt a bit
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // For iOS, show after a delay
        if (iOS) {
            setTimeout(() => setShowPrompt(true), 5000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowPrompt(false);
            }
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-dismissed', 'true');
    };

    if (!showPrompt) return null;

    return (
        <div className='fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[1000] animate-slide-up'>
            <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 relative'>
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className='absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                    aria-label='Dismiss'
                >
                    <X className='w-4 h-4' />
                </button>

                <div className='flex items-start gap-3'>
                    {/* App icon */}
                    <img
                        src='/logo-blue.png'
                        alt='PeerToLearn'
                        className='w-12 h-12 rounded-xl'
                    />

                    <div className='flex-1 min-w-0'>
                        <h3 className='font-semibold text-gray-900 dark:text-white text-sm'>
                            Install PeerToLearn
                        </h3>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                            {isIOS
                                ? 'Tap Share, then "Add to Home Screen"'
                                : 'Install for quick access & offline mode'}
                        </p>
                    </div>
                </div>

                {/* Action button - different for iOS */}
                {!isIOS && (
                    <button
                        onClick={handleInstall}
                        className='w-full mt-3 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-98'
                    >
                        <Download className='w-4 h-4' />
                        Install App
                    </button>
                )}

                {isIOS && (
                    <div className='mt-3 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-xl text-center'>
                        <span className='text-xs text-gray-600 dark:text-gray-400'>
                            Tap <span className='inline-block mx-1'>⬆️</span> then "Add to Home Screen"
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default InstallPrompt;
