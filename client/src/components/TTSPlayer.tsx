import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, Loader2, Volume2, SkipForward } from 'lucide-react';
import api from '../lib/api';

interface TTSPlayerProps {
  text: string;
  onClose: () => void;
  defaultVoice?: string;
  // Page-aware TTS props
  currentPage?: number;
  totalPages?: number;
  onNavigateToPage?: (page: number) => void;
  // Material-level TTS (optional) - enables cache reuse across users
  materialId?: string;
  startChunk?: number;
  // Highlight callback for text synchronization
  onHighlightChange?: (range: { start: number; end: number } | null) => void;
}

interface VoiceInfo {
  name: string;
  gender: 'male' | 'female';
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'rate_limited';
  totalChunks: number;
  completedChunks: number;
  chunkUrls: string[];
  errorMessage?: string;
}

interface MaterialChunkStatus {
  chunkIndex: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  audioUrl: string | null;
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

export function TTSPlayer({
  text,
  onClose,
  defaultVoice = 'Idera',
  currentPage = 1,
  totalPages = 0,
  onNavigateToPage: _onNavigateToPage,
  materialId,
  startChunk = 0,
  onHighlightChange,
}: TTSPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false); // Waiting for next chunk
  const [bufferingChunk, setBufferingChunk] = useState<number | null>(null); // Which chunk we're waiting for
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState(defaultVoice);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Browser TTS fallback
  const [useBrowserTTS, setUseBrowserTTS] = useState(false);
  const browserTTSRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Page-aware mode: show page progress when totalPages > 0
  const isPageAware = totalPages > 0;
  const [readingPage, _setReadingPage] = useState(currentPage);

  // Refs for stable references (avoid stale closures)
  const jobIdRef = useRef<string | null>(null);
  const audioQueueRef = useRef<HTMLAudioElement[]>([]);
  const currentAudioIndexRef = useRef(0);
  const processedChunksRef = useRef<Set<number>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1);
  const pollJobStatusRef = useRef<((jobId: string) => Promise<void>) | null>(null);
  const voiceRef = useRef(defaultVoice);
  const pollRetryCountRef = useRef(0);
  const startChunkRef = useRef(startChunk);
  const totalChunksRef = useRef(0); // Actual total chunks from backend
  const initialStartPageRef = useRef(currentPage); // Page when TTS started - don't change this
  const chunkBoundariesRef = useRef<{ start: number; end: number }[]>([]); // Chunk character boundaries for highlighting
  const onHighlightChangeRef = useRef(onHighlightChange); // Stable callback ref
  const MAX_POLL_RETRIES = 30; // Max polling errors before giving up
  const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minute absolute timeout
  const pollStartTimeRef = useRef<number>(0);

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

  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

  useEffect(() => {
    onHighlightChangeRef.current = onHighlightChange;
  }, [onHighlightChange]);

  // NOTE: startChunkRef is intentionally NOT updated after mount
  // It's set once in useRef(startChunk) and stays fixed during playback
  // This prevents page calculation from jumping backwards when onNavigate updates currentPage

  // Keep track of which page is being read (estimated from chunk progress)
  const onNavigateRef = useRef(_onNavigateToPage);
  const totalPagesRef = useRef(totalPages);
  const currentPageRef = useRef(currentPage);

  useEffect(() => {
    onNavigateRef.current = _onNavigateToPage;
    totalPagesRef.current = totalPages;
    currentPageRef.current = currentPage;
  }, [_onNavigateToPage, totalPages, currentPage]);

  // Estimate current page based on which chunk is currently playing
  const updatePageFromProgress = useCallback((currentChunkIndex: number) => {
    const totalChunks = totalChunksRef.current;
    const totalPagesCount = totalPagesRef.current;
    const effectiveStartChunk = startChunkRef.current || 0;
    const initialPage = initialStartPageRef.current;

    // Early returns for invalid state
    if (!totalPagesCount || totalChunks <= 0) return;

    // Safeguard: clamp currentChunkIndex to valid range
    const safeChunkIndex = Math.min(currentChunkIndex, totalChunks - 1);

    // Calculate how many chunks we've played relative to startChunk
    const chunksPlayedFromStart = safeChunkIndex - effectiveStartChunk;
    if (chunksPlayedFromStart < 0) return; // Playing earlier chunks, don't update page

    // Calculate chunks per page based on total content
    const chunksPerPage = totalChunks / totalPagesCount;
    if (chunksPerPage <= 0) return;

    // Calculate pages advanced, capped to remaining pages from initial position
    const maxPagesFromInitial = totalPagesCount - initialPage;
    const rawPagesAdvanced = Math.floor(chunksPlayedFromStart / chunksPerPage);
    const pagesAdvanced = Math.min(rawPagesAdvanced, maxPagesFromInitial);
    const estimatedPage = initialPage + pagesAdvanced;

    // Debug logging
    console.log(`[Page Calc] chunk=${safeChunkIndex}/${totalChunks}, startChunk=${effectiveStartChunk}, ` +
      `played=${chunksPlayedFromStart}, chunksPerPage=${chunksPerPage.toFixed(2)}, ` +
      `pagesAdvanced=${pagesAdvanced}, estimatedPage=${estimatedPage}, initialPage=${initialPage}`);

    // Only update if different and valid
    if (estimatedPage > 0 && estimatedPage <= totalPagesCount && estimatedPage !== currentPageRef.current) {
      console.log(`Auto-advancing to page ${estimatedPage}`);
      _setReadingPage(estimatedPage);
      currentPageRef.current = estimatedPage;
      onNavigateRef.current?.(estimatedPage);
    }
  }, []);

  // Play next audio in queue
  const playNextInQueue = useCallback(() => {
    const queue = audioQueueRef.current;
    const currentIndex = currentAudioIndexRef.current;
    const totalChunks = totalChunksRef.current;

    // Memory cleanup: clear already-played chunks to prevent memory leak
    if (currentIndex > 0 && queue[currentIndex - 1]) {
      queue[currentIndex - 1].src = '';
      queue[currentIndex - 1] = null as any;
    }

    // Check if we've finished all chunks (playback complete)
    if (totalChunks > 0 && currentIndex >= totalChunks) {
      console.log('Playback complete - all chunks played');
      setIsPlaying(false);
      setIsBuffering(false);
      setBufferingChunk(null);
      onHighlightChangeRef.current?.(null); // Clear highlight when playback ends
      return;
    }

    if (currentIndex < queue.length && queue[currentIndex]) {
      const audio = queue[currentIndex];
      audio.playbackRate = playbackRateRef.current;
      setIsBuffering(false);
      setBufferingChunk(null);
      audio.play().catch(err => {
        console.error('Failed to play audio:', err);
        // Try next chunk on failure
        currentAudioIndexRef.current++;
        playNextInQueue();
      });
      setIsPlaying(true);

      // Update page estimate based on which chunk is playing
      updatePageFromProgress(currentIndex);

      // Preload: trigger loading of next chunk if not already in queue
      const nextIndex = currentIndex + 1;
      if (nextIndex < totalChunks && !processedChunksRef.current.has(nextIndex)) {
        console.log(`Preloading: chunk ${nextIndex} should be prioritized`);
        // The backend will have it in queue, but we note it for logging
      }
    } else {
      // No more to play right now - show buffering state with specific chunk
      setIsPlaying(false);
      setIsBuffering(true);
      setBufferingChunk(currentIndex); // Track which chunk we're waiting for
      console.log(`Buffering: waiting for chunk ${currentIndex}/${totalChunks}`);
    }
  }, [updatePageFromProgress]);

  // Add chunk to queue
  const addChunkToQueue = useCallback((url: string, index: number) => {
    if (processedChunksRef.current.has(index)) return;
    processedChunksRef.current.add(index);

    console.log(`Adding chunk ${index} to queue: ${url}`);

    const audio = new Audio(url);
    audio.playbackRate = playbackRateRef.current;

    audio.onended = () => {
      // Only act if this chunk is still the current one (prevent race conditions)
      if (currentAudioIndexRef.current === index) {
        console.log(`Chunk ${index} ended, moving to next`);
        currentAudioIndexRef.current++;
        playNextInQueue();
      } else {
        console.log(`Chunk ${index} ended but already passed (current=${currentAudioIndexRef.current}), ignoring`);
      }
    };

    audio.onerror = (e) => {
      // Only act if this chunk is still the current one (prevent late error handlers from skipping ahead)
      if (currentAudioIndexRef.current === index) {
        console.error(`Failed to load audio chunk ${index}:`, e);
        currentAudioIndexRef.current++;
        playNextInQueue();
      } else {
        console.warn(`Chunk ${index} error but already passed (current=${currentAudioIndexRef.current}), ignoring`);
      }
    };

    audio.oncanplaythrough = () => {
      console.log(`Chunk ${index} ready to play, isPlaying=${isPlayingRef.current}, currentIndex=${currentAudioIndexRef.current}`);

      const effectiveStartChunk = startChunkRef.current || 0;

      // Auto-start in two scenarios:
      // 1. This is the startChunk and nothing is playing (initial start)
      // 2. This is the chunk we're waiting for (currentAudioIndex) and nothing is playing (resume after gap)
      if (!isPlayingRef.current && currentAudioIndexRef.current === index) {
        if (index === effectiveStartChunk) {
          console.log(`Starting playback with chunk ${index} (startChunk=${effectiveStartChunk})`);
        } else {
          console.log(`Resuming playback with chunk ${index} (was waiting for this chunk)`);
        }
        setIsLoading(false);
        setIsBuffering(false); // Clear buffering state
        setBufferingChunk(null); // Clear which chunk we were waiting for
        audio.play().catch(console.error);
        setIsPlaying(true);
      }
    };

    // Highlight-as-you-read: calculate sentence position from elapsed time
    audio.ontimeupdate = () => {
      if (!onHighlightChangeRef.current) return;

      const boundaries = chunkBoundariesRef.current;
      if (!boundaries.length || index >= boundaries.length) return;

      const chunkRange = boundaries[index];
      const chunkText = text.substring(chunkRange.start, chunkRange.end);

      // Split into sentences - handle periods, exclamations, questions, and newlines as breaks
      // Use a more robust approach: split on sentence-ending punctuation followed by space/newline
      const sentencePattern = /[^.!?\n]+(?:[.!?]+|\n)+|[^.!?\n]+$/g;
      const sentences = chunkText.match(sentencePattern) || [chunkText];
      if (sentences.length === 0) return;

      const elapsed = audio.currentTime;
      const duration = audio.duration;

      // Guard against invalid duration (NaN before metadata loads, or 0)
      if (!duration || isNaN(duration) || duration === 0) return;

      // Calculate which sentence based on elapsed time
      const timePerSentence = duration / sentences.length;
      const sentenceIndex = Math.min(Math.floor(elapsed / timePerSentence), sentences.length - 1);

      // Calculate absolute character position
      let charOffset = 0;
      for (let i = 0; i < sentenceIndex && i < sentences.length; i++) {
        charOffset += sentences[i].length;
      }

      const highlightStart = chunkRange.start + charOffset;
      const highlightEnd = highlightStart + (sentences[sentenceIndex]?.length || 0);

      onHighlightChangeRef.current({ start: highlightStart, end: highlightEnd });
    };

    // Fill queue at the right position
    while (audioQueueRef.current.length <= index) {
      audioQueueRef.current.push(null as any);
    }
    audioQueueRef.current[index] = audio;
  }, [playNextInQueue, text]);

  // Poll job status - use ref to prevent useEffect dependency loop
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
      totalChunksRef.current = status.totalChunks;
      setProgress({ current: status.completedChunks, total: status.totalChunks });

      // Add new chunks to queue
      status.chunkUrls.forEach((url, index) => {
        if (url && !processedChunksRef.current.has(index)) {
          addChunkToQueue(url, index);
        }
      });

      if (status.status === 'failed' || status.status === 'rate_limited') {
        setError(status.errorMessage || 'TTS generation failed');
        setIsLoading(false);
        return;
      }

      if (status.status !== 'completed') {
        // Continue polling using ref to avoid stale closure
        pollingRef.current = setTimeout(() => {
          if (pollJobStatusRef.current) {
            pollJobStatusRef.current(jobId);
          }
        }, 2000);
      } else {
        console.log('Job completed, all chunks ready');
      }
    } catch (err: any) {
      console.error('Failed to poll job status:', err?.response?.status, err?.message);
      if (!cancelledRef.current) {
        const errorMsg = err?.response?.data?.message || err?.message || 'Failed to check generation status';
        setError(errorMsg);
        setIsLoading(false);
      }
    }
  }, [addChunkToQueue]);

  // Keep pollJobStatus ref in sync
  useEffect(() => {
    pollJobStatusRef.current = pollJobStatus;
  }, [pollJobStatus]);

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
    // Initialize currentAudioIndex to startChunk for mid-file playback
    currentAudioIndexRef.current = startChunk || 0;
    processedChunksRef.current.clear();
    pollStartTimeRef.current = Date.now();
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }

    const startStream = async () => {
      try {
        console.log('Starting TTS stream...');

        // Use material-level endpoints when materialId is provided
        if (materialId) {
          console.log(`Using material-level TTS for ${materialId}, starting from chunk ${startChunk}`);
          const response = await api.post(`/tts/material/${materialId}/start`, {
            content: text,
            voice,
            startChunk,
          });

          if (cancelledRef.current) return;

          const { totalChunks, chunks, chunkBoundaries } = response.data;
          totalChunksRef.current = totalChunks;
          if (chunkBoundaries) {
            chunkBoundariesRef.current = chunkBoundaries;
          }
          setProgress({ current: chunks.filter((c: MaterialChunkStatus) => c.status === 'completed').length, total: totalChunks });

          // Add any already-completed chunks to queue
          chunks.forEach((chunk: MaterialChunkStatus) => {
            if (chunk.status === 'completed' && chunk.audioUrl && !processedChunksRef.current.has(chunk.chunkIndex)) {
              addChunkToQueue(chunk.audioUrl, chunk.chunkIndex);
            }
          });

          // Check if all chunks are done
          const allDone = chunks.every((c: MaterialChunkStatus) => c.status === 'completed');
          if (allDone && totalChunks > 0) {
            setIsLoading(false);
          } else {
            // Start polling for material chunks
            const pollMaterialChunks = async () => {
              if (cancelledRef.current) return;

              try {
                // Use voiceRef.current for stable reference
                const statusRes = await api.get(`/tts/material/${materialId}/chunks?voice=${voiceRef.current}`);
                const { totalChunks: total, chunks: updatedChunks, chunkBoundaries: boundaries } = statusRes.data;

                // Reset retry count on successful poll
                pollRetryCountRef.current = 0;

                totalChunksRef.current = total;
                if (boundaries && chunkBoundariesRef.current.length === 0) {
                  chunkBoundariesRef.current = boundaries;
                }
                setProgress({
                  current: updatedChunks.filter((c: MaterialChunkStatus) => c.status === 'completed').length,
                  total
                });

                // Add newly completed chunks
                updatedChunks.forEach((chunk: MaterialChunkStatus) => {
                  if (chunk.status === 'completed' && chunk.audioUrl && !processedChunksRef.current.has(chunk.chunkIndex)) {
                    addChunkToQueue(chunk.audioUrl, chunk.chunkIndex);
                  }
                });

                // Check if any failed
                // Check if any failed - Don't stop everything, just log warning
                // Failed chunks might be retrying or far ahead
                const hasFailed = updatedChunks.some((c: MaterialChunkStatus) => c.status === 'failed');
                if (hasFailed) {
                  console.warn('Some chunks reported failure - continuing polling in case of retries');
                }

                // Check if all done
                const allComplete = updatedChunks.every((c: MaterialChunkStatus) => c.status === 'completed');
                if (allComplete) {
                  setIsLoading(false);
                  return;
                }

                // Check absolute timeout (5 minutes) - Bug #5 fix
                if (Date.now() - pollStartTimeRef.current > MAX_POLL_TIME_MS) {
                  console.warn('Max polling time exceeded, stopping...');
                  setIsLoading(false);
                  // Don't show error - just stop loading, audio might still play
                  return;
                }

                // Continue polling
                pollingRef.current = setTimeout(pollMaterialChunks, 1000);
              } catch (err) {
                console.error('Material chunk polling error:', err);
                pollRetryCountRef.current++;

                // Stop polling after max retries to prevent infinite loop
                if (pollRetryCountRef.current >= MAX_POLL_RETRIES) {
                  setError('Network error - please try again');
                  setIsLoading(false);
                  return;
                }

                pollingRef.current = setTimeout(pollMaterialChunks, 2000);
              }
            };
            pollMaterialChunks();
          }
          return;
        }

        // Legacy: text-based streaming
        const response = await api.post('/tts/start-stream', {
          text,
          voice,
          responseFormat: 'mp3',
        });

        if (cancelledRef.current) return;


        const { jobId, cached, chunkUrls, totalChunks, completedChunks, status } = response.data;

        // If cached (completed job), add all chunks to queue immediately
        if (cached && chunkUrls && chunkUrls.length > 0) {
          console.log(`TTS from cache: ${chunkUrls.length} chunks ready`);
          totalChunksRef.current = totalChunks;
          setProgress({ current: completedChunks, total: totalChunks });

          // Add all cached chunks to queue
          chunkUrls.forEach((url: string, index: number) => {
            if (url) addChunkToQueue(url, index);
          });

          // If all chunks are ready, we can stop loading
          if (completedChunks >= totalChunks) {
            setIsLoading(false);
          }
          return;
        }

        // Start/join a job - poll for chunks
        console.log(`TTS stream job: ${jobId}, status=${status}, ${completedChunks}/${totalChunks} chunks ready`);
        jobIdRef.current = jobId;
        totalChunksRef.current = totalChunks;
        setProgress({ current: completedChunks || 0, total: totalChunks });

        // Add any already-available chunks
        if (chunkUrls && chunkUrls.length > 0) {
          chunkUrls.forEach((url: string, index: number) => {
            if (url) addChunkToQueue(url, index);
          });
        }

        // Start polling for more chunks - use ref to get latest function
        if (pollJobStatusRef.current) {
          pollJobStatusRef.current(jobId);
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, voice]); // Only restart on text/voice change, not pollJobStatus (uses ref)

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

  // Skip current chunk if stuck
  const skipCurrentChunk = () => {
    console.log(`Skipping chunk ${currentAudioIndexRef.current}`);
    const queue = audioQueueRef.current;
    const currentIndex = currentAudioIndexRef.current;

    // Stop current audio if playing
    if (queue[currentIndex]) {
      queue[currentIndex].pause();
      queue[currentIndex].src = '';
    }

    // Move to next chunk
    currentAudioIndexRef.current++;
    setIsBuffering(false);
    setBufferingChunk(null);
    onHighlightChangeRef.current?.(null); // Clear highlight when skipping
    playNextInQueue();
  };

  const handleVoiceChange = (newVoice: string) => {
    if (newVoice === voice) {
      setShowVoiceSelector(false);
      return;
    }

    // Voice changed - stop current playback and restart with new voice
    console.log(`Voice changed from ${voice} to ${newVoice}, restarting...`);

    // Stop current audio
    audioQueueRef.current.forEach(audio => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    });
    audioQueueRef.current = [];
    currentAudioIndexRef.current = startChunk || 0;
    processedChunksRef.current.clear();

    // Clear polling
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }

    // Update voice and restart
    setVoice(newVoice);
    setShowVoiceSelector(false);
    setIsLoading(true);
    setIsPlaying(false);
    setIsBuffering(false);
    setError(null);
    onHighlightChangeRef.current?.(null); // Clear highlight on voice change

    // Will trigger useEffect to restart with new voice
  };

  const handleClose = () => {
    cancelledRef.current = true;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }
    audioQueueRef.current.forEach(audio => {
      if (audio) audio.pause();
    });
    // Stop browser TTS if active
    if (useBrowserTTS) {
      window.speechSynthesis.cancel();
    }
    onClose();
  };

  // Browser TTS fallback functions
  const startBrowserTTS = () => {
    if (!('speechSynthesis' in window)) {
      setError('Browser does not support text-to-speech');
      return;
    }

    // Cancel any existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = playbackRate;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to find a good voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
    };

    utterance.onend = () => {
      setIsPlaying(false);
    };

    utterance.onerror = (e) => {
      console.error('Browser TTS error:', e);
      setError('Browser speech failed');
      setIsPlaying(false);
    };

    browserTTSRef.current = utterance;
    setUseBrowserTTS(true);
    window.speechSynthesis.speak(utterance);
  };

  const toggleBrowserTTS = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      window.speechSynthesis.resume();
      setIsPlaying(true);
    }
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
          onClick={useBrowserTTS ? toggleBrowserTTS : togglePlay}
          disabled={isLoading || (!!error && !useBrowserTTS)}
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

        {/* Progress indicator */}
        {isLoading && progress.total > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 min-w-[40px]">
            {progress.current}/{progress.total}
          </div>
        )}

        {/* Buffering indicator - waiting for next chunk */}
        {isBuffering && !isLoading && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>
              {bufferingChunk !== null && progress.total > 0
                ? `Waiting ${bufferingChunk + 1}/${progress.total}`
                : 'Buffering...'}
            </span>
            <button
              onClick={skipCurrentChunk}
              className="ml-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Skip to next chunk"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Page indicator when playing (not loading) */}
        {!isLoading && isPageAware && (
          <div className="text-xs text-gray-600 dark:text-gray-300 min-w-[60px] font-medium">
            📖 Page {readingPage}/{totalPages}
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
          <div className="flex items-center justify-between gap-2">
            <span>{error}</span>
            {'speechSynthesis' in window && !useBrowserTTS && (
              <button
                onClick={startBrowserTTS}
                className="px-2 py-1 bg-primary-500 text-white text-xs rounded hover:bg-primary-600 transition-colors whitespace-nowrap"
              >
                Use Browser Voice
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
