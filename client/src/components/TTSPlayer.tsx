import { useState, useEffect, useRef, useCallback } from 'react';
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

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalChunks: number;
  completedChunks: number;
  chunkUrls: string[];
  errorMessage?: string;
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
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Refs for stable references (avoid stale closures)
  const jobIdRef = useRef<string | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioIndexRef = useRef(0);
  const processedChunksRef = useRef<Set<number>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1);

  // Keep refs in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
    // Update playback rate on all queued audio
    audioQueueRef.current.forEach(audio => {
      if (audio) {
        audio.playbackRate = playbackRate;
      }
    });
  }, [playbackRate]);

  // Play next audio in queue
  const playNextInQueue = useCallback(() => {
    const queue = audioQueueRef.current;
    const currentIndex = currentAudioIndexRef.current;

    if (currentIndex < queue.length && queue[currentIndex]) {
      const audio = queue[currentIndex];
      audio.playbackRate = playbackRateRef.current;
      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        // Try next chunk on failure
        currentAudioIndexRef.current++;
        playNextInQueue();
      });
      setIsPlaying(true);
    } else {
      // No more to play right now
      setIsPlaying(false);
    }
  }, []);

  // Add chunk to queue
  const addChunkToQueue = useCallback((url: string, index: number) => {
    if (processedChunksRef.current.has(index)) return;
    processedChunksRef.current.add(index);

    console.log(`Adding chunk ${index} to queue: ${url}`);

    const audio = new Audio(url);
    audio.playbackRate = playbackRateRef.current;

    audio.onended = () => {
      console.log(`Chunk ${index} ended, moving to next`);
      currentAudioIndexRef.current++;
      playNextInQueue();
    };

    audio.onerror = (e) => {
      console.error(`Failed to load audio chunk ${index}:`, e);
      currentAudioIndexRef.current++;
      playNextInQueue();
    };

    audio.oncanplaythrough = () => {
      console.log(`Chunk ${index} ready to play, isPlaying=${isPlayingRef.current}, currentIndex=${currentAudioIndexRef.current}`);
      // If this is the first chunk and nothing is playing yet, start playback
      if (index === 0 && !isPlayingRef.current && currentAudioIndexRef.current === 0) {
        console.log('Starting playback with first chunk');
        setIsLoading(false);
        audio.play().catch(console.error);
        setIsPlaying(true);
      }
    };

    // Fill queue at the right position
    while (audioQueueRef.current.length <= index) {
      audioQueueRef.current.push(null as any);
    }
    audioQueueRef.current[index] = audio;
  }, [playNextInQueue]);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    if (cancelledRef.current) {
      console.log('Polling cancelled');
      return;
    }

    try {
      console.log(`Polling job ${jobId}...`);
      const response = await api.get(`/tts/job/${jobId}`);
      const status: JobStatus = response.data;

      console.log(`Job status: ${status.status}, chunks: ${status.completedChunks}/${status.totalChunks}`);
      setProgress({ current: status.completedChunks, total: status.totalChunks });

      // Add new chunks to queue
      status.chunkUrls.forEach((url, index) => {
        if (url && !processedChunksRef.current.has(index)) {
          addChunkToQueue(url, index);
        }
      });

      if (status.status === 'failed') {
        setError(status.errorMessage || 'TTS generation failed');
        setIsLoading(false);
        return;
      }

      if (status.status !== 'completed') {
        // Continue polling
        pollingRef.current = setTimeout(() => pollJobStatus(jobId), 2000);
      } else {
        console.log('Job completed, all chunks ready');
      }
    } catch (err: any) {
      console.error('Failed to poll job status:', err);
      if (!cancelledRef.current) {
        setError('Failed to check generation status');
        setIsLoading(false);
      }
    }
  }, [addChunkToQueue]);

  // Start streaming audio generation - only depends on text and voice
  useEffect(() => {
    cancelledRef.current = false;
    setIsLoading(true);
    setError(null);
    setIsPlaying(false);
    setProgress({ current: 0, total: 0 });

    // Cleanup previous
    audioQueueRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    });
    audioQueueRef.current = [];
    currentAudioIndexRef.current = 0;
    processedChunksRef.current.clear();
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }

    const startStream = async () => {
      try {
        console.log('Starting TTS stream...');
        const response = await api.post('/tts/start-stream', {
          text,
          voice,
          responseFormat: 'mp3',
        });

        if (cancelledRef.current) return;

        const { jobId, cached, cacheUrl, totalChunks } = response.data;

        if (cached && cacheUrl) {
          // Use cached audio directly
          console.log('TTS from cache:', cacheUrl);
          const audio = new Audio(cacheUrl);
          audio.playbackRate = playbackRateRef.current;
          audio.oncanplaythrough = () => {
            setIsLoading(false);
            audio.play();
            setIsPlaying(true);
          };
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => {
            setError('Failed to play cached audio');
            setIsLoading(false);
          };
          audioQueueRef.current = [audio];
          return;
        }

        // Start polling for chunks
        console.log(`Starting TTS stream job: ${jobId}, ${totalChunks} chunks`);
        jobIdRef.current = jobId;
        setProgress({ current: 0, total: totalChunks });
        pollJobStatus(jobId);
      } catch (err: any) {
        if (!cancelledRef.current) {
          console.error('Failed to start stream:', err);
          setError(err.response?.data?.message || 'Failed to start TTS generation');
          setIsLoading(false);
        }
      }
    };

    startStream();

    return () => {
      console.log('Cleanup: cancelling TTS');
      cancelledRef.current = true;
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
      audioQueueRef.current.forEach(audio => {
        if (audio) {
          audio.pause();
        }
      });
    };
  }, [text, voice, pollJobStatus]); // Removed playbackRate - handled separately

  const togglePlay = () => {
    const currentAudio = audioQueueRef.current[currentAudioIndexRef.current];
    if (!currentAudio) return;

    if (isPlaying) {
      currentAudio.pause();
      setIsPlaying(false);
    } else {
      currentAudio.play();
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
    cancelledRef.current = true;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }
    audioQueueRef.current.forEach(audio => {
      if (audio) audio.pause();
    });
    onClose();
  };

  return (
    <div className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
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
          title={isLoading ? `Generating... (${progress.current}/${progress.total})` : isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Progress indicator during generation */}
        {isLoading && progress.total > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
            {progress.current}/{progress.total}
          </div>
        )}

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
