import { useState, useEffect, useRef } from 'react';
import { Play, Pause, X, Loader2, Volume2 } from 'lucide-react';
import api from '../lib/api';

interface TTSPlayerProps {
  text: string;
  onClose: () => void;
  defaultVoice?: string;
}

interface VoiceInfo {
  name: string;
  gender: 'male' | 'female';
}

const VOICES: VoiceInfo[] = [
  // Female voices
  { name: 'Idera', gender: 'female' },
  { name: 'Zainab', gender: 'female' },
  { name: 'Wura', gender: 'female' },
  { name: 'Chinenye', gender: 'female' },
  { name: 'Regina', gender: 'female' },
  { name: 'Adaora', gender: 'female' },
  { name: 'Mary', gender: 'female' },
  { name: 'Remi', gender: 'female' },
  // Male voices
  { name: 'Emma', gender: 'male' },
  { name: 'Osagie', gender: 'male' },
  { name: 'Jude', gender: 'male' },
  { name: 'Tayo', gender: 'male' },
  { name: 'Femi', gender: 'male' },
  { name: 'Umar', gender: 'male' },
  { name: 'Nonso', gender: 'male' },
  { name: 'Adam', gender: 'male' },
];

export function TTSPlayer({ text, onClose, defaultVoice = 'Idera' }: TTSPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState(defaultVoice);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Generate audio when text or voice changes
  useEffect(() => {
    let cancelled = false;

    const generateAudio = async () => {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);

      // Cleanup previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }

      try {
        const response = await api.post(
          '/tts/generate',
          { text, voice, responseFormat: 'mp3' },
          { responseType: 'blob' }
        );

        if (cancelled) return;

        const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        audioUrlRef.current = audioUrl;

        const audio = new Audio(audioUrl);
        audio.playbackRate = playbackRate;

        audio.oncanplaythrough = () => {
          if (!cancelled) {
            setIsLoading(false);
            audio.play();
            setIsPlaying(true);
          }
        };

        audio.onended = () => {
          if (!cancelled) setIsPlaying(false);
        };

        audio.onerror = () => {
          if (!cancelled) {
            setError('Failed to play audio');
            setIsLoading(false);
          }
        };

        audioRef.current = audio;
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to generate speech');
          setIsLoading(false);
        }
      }
    };

    generateAudio();

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [text, voice]);

  // Update playback rate when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const handleVoiceChange = (newVoice: string) => {
    setVoice(newVoice);
    setShowVoiceSelector(false);
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    onClose();
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      {/* Voice Selector Popup */}
      {showVoiceSelector && (
        <div className="absolute bottom-16 right-0 w-48 max-h-64 overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 mb-2">
          <div className="px-3 py-2 text-xs text-gray-500 font-medium border-b border-gray-100 dark:border-gray-700">
            Select Voice
          </div>
          <div className="py-1">
            <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider">Female</div>
            {VOICES.filter(v => v.gender === 'female').map((v) => (
              <button
                key={v.name}
                onClick={() => handleVoiceChange(v.name)}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${voice === v.name ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
              >
                {v.name}
              </button>
            ))}
            <div className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider mt-1">Male</div>
            {VOICES.filter(v => v.gender === 'male').map((v) => (
              <button
                key={v.name}
                onClick={() => handleVoiceChange(v.name)}
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${voice === v.name ? 'text-primary-600 font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Player */}
      <div className="bg-white dark:bg-gray-800 rounded-full shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex items-center space-x-2">
        {/* Play/Pause or Loading */}
        <button
          onClick={togglePlay}
          disabled={isLoading || !!error}
          className="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors disabled:bg-gray-400"
          title={isLoading ? 'Generating...' : isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Playback Rate */}
        <button
          onClick={cyclePlaybackRate}
          disabled={isLoading}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-bold disabled:opacity-50"
          title="Change Speed"
        >
          {playbackRate}x
        </button>

        {/* Voice Selector Toggle */}
        <button
          onClick={() => setShowVoiceSelector(!showVoiceSelector)}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title={`Voice: ${voice}`}
        >
          <Volume2 className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          title="Close TTS"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-lg">
          {error}
        </div>
      )}
    </div>
  );
}
