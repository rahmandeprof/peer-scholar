import { X, type LucideIcon } from 'lucide-react';

interface FeatureSpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  icon: LucideIcon;
}

export function FeatureSpotlightModal({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
}: FeatureSpotlightModalProps) {
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
