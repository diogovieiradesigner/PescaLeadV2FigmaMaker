import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  duration?: number; // Duration in seconds
  isOwnMessage?: boolean;
  isDark?: boolean;
}

export function AudioPlayer({ src, duration: initialDuration, isOwnMessage, isDark }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      const durationVal = audio.duration || duration;
      if (durationVal > 0 && durationVal !== Infinity) {
        setProgress((audio.currentTime / durationVal) * 100);
      }
    };

    const handleLoadedMetadata = () => {
       // If we don't have an initial duration, or if the audio loaded gives us a better one
       if (audio.duration && audio.duration !== Infinity) {
         setDuration(audio.duration);
       }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [duration]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Pause all other audios if needed (optional, but good UX)
        document.querySelectorAll('audio').forEach(el => {
            if (el !== audioRef.current) el.pause();
        });
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Generate fake waveform bars
  // We create a deterministic pattern based on the src length or similar to keep it consistent but "random" looking
  const bars = useMemo(() => {
    // Seeded random-ish generator based on index
    return Array.from({ length: 40 }, (_, i) => {
        // Create a wave pattern: sin wave + random noise
        const wave = Math.sin(i * 0.2) * 30 + 50; // Base wave
        const noise = (Math.random() - 0.5) * 40;
        return Math.max(20, Math.min(100, wave + noise));
    }); 
  }, []);

  return (
    <div className="flex items-center gap-3 min-w-[240px] py-1 pr-2">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
          isOwnMessage 
            ? 'bg-white/20 hover:bg-white/30 text-white' 
            : isDark 
                ? 'bg-white/10 hover:bg-white/20 text-white'
                : 'bg-black/5 hover:bg-black/10 text-gray-700'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex flex-col gap-1 flex-1 select-none cursor-pointer" onClick={(e) => {
          // Allow clicking on waveform to seek
          if (!audioRef.current) return;
          const bounds = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - bounds.left;
          const width = bounds.width;
          const newTime = (x / width) * duration;
          audioRef.current.currentTime = newTime;
          // If strictly not playing, we just update visual. If playing, it continues.
      }}>
        {/* Waveform Visualization */}
        <div className="flex items-center justify-between h-8 w-full">
            {bars.map((height, index) => {
                const percent = (index / bars.length) * 100;
                const isPlayed = percent <= progress;
                
                return (
                    <div 
                        key={index}
                        className={`w-[3px] rounded-full transition-all duration-200 ${
                           isOwnMessage 
                             ? (isPlayed ? 'bg-white/90' : 'bg-white/40')
                             : isDark
                                ? (isPlayed ? 'bg-white/90' : 'bg-white/30')
                                : (isPlayed ? 'bg-gray-600' : 'bg-gray-300')
                        }`}
                        style={{ height: `${height}%` }}
                    />
                );
            })}
        </div>
        
        <div className="flex justify-between text-xs opacity-80">
             <span className={isOwnMessage ? 'text-white' : isDark ? 'text-white/70' : 'text-gray-500'}>
                {formatTime(currentTime)}
            </span>
            <span className={isOwnMessage ? 'text-white' : isDark ? 'text-white/70' : 'text-gray-500'}>
                {formatTime(duration)}
            </span>
        </div>
      </div>
    </div>
  );
}
