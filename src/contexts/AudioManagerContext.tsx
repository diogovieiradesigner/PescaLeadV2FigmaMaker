import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Context para gerenciar reprodução de áudios globalmente
 * ✅ SOLUÇÃO: Evita memory leak de querySelectorAll('audio')
 */

interface AudioManagerContextType {
  currentAudio: HTMLAudioElement | null;
  playAudio: (audio: HTMLAudioElement) => void;
  pauseAudio: () => void;
  isCurrentAudio: (audio: HTMLAudioElement) => boolean;
}

const AudioManagerContext = createContext<AudioManagerContextType | undefined>(undefined);

export function AudioManagerProvider({ children }: { children: ReactNode }) {
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  const playAudio = useCallback((audio: HTMLAudioElement) => {
    // Pausar áudio anterior se existir
    if (currentAudio && currentAudio !== audio) {
      currentAudio.pause();
    }
    
    // Definir novo áudio atual
    setCurrentAudio(audio);
  }, [currentAudio]);

  const pauseAudio = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      setCurrentAudio(null);
    }
  }, [currentAudio]);

  const isCurrentAudio = useCallback((audio: HTMLAudioElement) => {
    return currentAudio === audio;
  }, [currentAudio]);

  return (
    <AudioManagerContext.Provider value={{ currentAudio, playAudio, pauseAudio, isCurrentAudio }}>
      {children}
    </AudioManagerContext.Provider>
  );
}

export function useAudioManager() {
  const context = useContext(AudioManagerContext);
  if (!context) {
    throw new Error('useAudioManager must be used within AudioManagerProvider');
  }
  return context;
}
