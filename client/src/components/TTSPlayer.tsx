import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X } from 'lucide-react';

interface TTSPlayerProps {
  text: string;
  onClose: () => void;
}

export function TTSPlayer({ text, onClose }: TTSPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [rate, setRate] = useState(1);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Cancel any existing speech on mount
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    
    u.onend = () => setIsPlaying(false);
    u.onpause = () => setIsPlaying(false);
    u.onresume = () => setIsPlaying(true);
    u.onstart = () => setIsPlaying(true);
    u.onerror = (e) => {
      console.error('TTS Error:', e);
      setIsPlaying(false);
    };

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [text]);

  const togglePlay = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      // Not speaking but finished? Restart.
      if (utteranceRef.current) {
        window.speechSynthesis.speak(utteranceRef.current);
        setIsPlaying(true);
      }
    }
  };

  const changeRate = () => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(rate) + 1) % rates.length];
    setRate(nextRate);
    
    // Note: Changing rate dynamically often requires restarting speech in many browsers.
    // For a seamless experience, we accept that the new rate applies to the next utterance 
    // or we would need to cancel and restart from the current character index (complex).
    // However, we can try updating the ref for future resumes if supported.
    if (utteranceRef.current) {
      utteranceRef.current.rate = nextRate;
      
      // Force restart to apply rate change if currently speaking
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        const newU = new SpeechSynthesisUtterance(text);
        newU.rate = nextRate;
        newU.onend = () => setIsPlaying(false);
        newU.onpause = () => setIsPlaying(false);
        newU.onresume = () => setIsPlaying(true);
        newU.onstart = () => setIsPlaying(true);
        utteranceRef.current = newU;
        window.speechSynthesis.speak(newU);
      }
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex items-center space-x-2 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <button
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </button>

      <button
        onClick={changeRate}
        className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-bold"
        title="Change Speed"
      >
        {rate}x
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

      <button
        onClick={onClose}
        className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
        title="Close TTS"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
