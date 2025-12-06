import { X, LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: LucideIcon;
  featureId: string; // Unique ID for localStorage
}

export function InfoModal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  featureId,
}: InfoModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const hasSeen = localStorage.getItem(`has_seen_feature_${featureId}`);
      if (!hasSeen) {
        setShow(true);
        localStorage.setItem(`has_seen_feature_${featureId}`, 'true');
      } else {
        // If already seen, ensure we don't block, but parent controls isOpen.
        // If parent relies on us to close, we should call onClose immediately?
        // Or maybe parent shouldn't even render us if seen?
        // Better pattern: Parent handles trigger. We just handle display.
        // But requirements say "Trigger it the first time a user clicks".
        // So parent clicks -> sets isOpen=true.
        // If we check localStorage here, we might show nothing even if isOpen=true.
        // Let's assume parent blindly opens, and we decide whether to show.
        // If seen, we call onClose immediately.
        onClose();
      }
    } else {
      setShow(false);
    }
  }, [isOpen, featureId, onClose]);

  // Wait, if we call onClose immediately in useEffect, it might cause loop if parent resets state.
  // Better approach: Parent should check localStorage before opening?
  // Or: This component is "Smart".
  // Let's adjust: The prompt says "Trigger it the first time".
  // So the click handler in parent should check.
  // BUT, to make it reusable and easy, maybe we just export a helper or hook?
  // Let's stick to a simple Modal that shows if isOpen is true.
  // The "First Time" logic should be in the parent's click handler or a custom hook.
  
  // Re-reading plan: "Internal logic: On mount, check localStorage. If seen, don't show... Actually, better to handle trigger in parent".
  // Let's make this a dumb component and handle logic in parent or hook.
  // BUT, to make it easy to drop in:
  // Let's create a hook `useFeatureSpotlight(featureId)` that returns `[showSpotlight, markAsSeen]`.
}

// Let's rewrite to be a simple dumb component first, as per standard React patterns.
// We'll handle the "first time" logic in the parent for explicit control.

export function FeatureSpotlightModal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
}: Omit<InfoModalProps, 'featureId'>) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-primary-500/10 to-purple-500/10 dark:from-primary-900/20 dark:to-purple-900/20" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center pt-4">
          <div className="w-16 h-16 bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex items-center justify-center mb-6 text-primary-600 dark:text-primary-400">
            <Icon className="w-8 h-8" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {title}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            {description}
          </p>

          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 hover:-translate-y-0.5"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
