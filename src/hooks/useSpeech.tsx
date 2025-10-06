import { useState, useEffect, useRef } from 'react';

export const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
    
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = (text: string) => {
    if (!isSupported) {
      console.error('TTS not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Configure voice - prefer Romanian if available
    const voices = window.speechSynthesis.getVoices();
    const romanianVoice = voices.find(voice => voice.lang.startsWith('ro'));
    if (romanianVoice) {
      utterance.voice = romanianVoice;
    }

    utterance.lang = 'ro-RO';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error('TTS error:', event);
      setIsSpeaking(false);
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      utteranceRef.current = null;
    }
  };

  const pause = () => {
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.pause();
    }
  };

  const resume = () => {
    if (window.speechSynthesis && isSpeaking) {
      window.speechSynthesis.resume();
    }
  };

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isSupported,
  };
};
