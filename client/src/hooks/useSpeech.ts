import { useState, useEffect, useCallback } from 'react';
import type { SpellingMode } from '../types';

export const useSpeech = () => {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  const loadVoices = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => 
      v.name.includes("Google US English") || 
      v.name.includes("Samantha") || 
      (v.lang === "en-US" && v.name.includes("Natural"))
    ) || voices.find(v => v.lang.startsWith("en"));
    setVoice(selectedVoice || null);
  }, []);

  useEffect(() => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [loadVoices]);

  const speakTokens = useCallback((tokens: string[], rate: number = 0.8): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();

      let index = 0;
      const next = () => {
        if (index >= tokens.length) {
          resolve();
          return;
        }

        const token = tokens[index++];
        if (token === '__PAUSE__') {
          setTimeout(next, 250);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(token);
        if (voice) utterance.voice = voice;
        utterance.rate = rate;
        utterance.onend = () => next();
        window.speechSynthesis.speak(utterance);
      };

      next();

      // Safety timeout
      setTimeout(() => resolve(), tokens.length * 800 + 500);
    });
  }, [voice]);

  const speak = useCallback((text: string, mode: SpellingMode): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      
      if (mode === 'letter') {
        const chars = text.split('');
        speakTokens(chars, 0.8).then(resolve);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.9;
        utterance.onend = () => resolve();
        window.speechSynthesis.speak(utterance);
        
        // Safety timeout
        setTimeout(() => resolve(), 2000);
      }
    });
  }, [voice, speakTokens]);

  return { speak, speakTokens };
};
