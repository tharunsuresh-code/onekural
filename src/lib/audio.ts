"use client";

import { useState, useEffect } from "react";

function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    const onChanged = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", onChanged, { once: true });
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 1000);
  });
}

export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);

  // Returns true if playback started, false if no Tamil voice available
  const play = async (text: string): Promise<boolean> => {
    if (typeof window === "undefined" || !window.speechSynthesis) return false;
    window.speechSynthesis.cancel();

    const voices = await getVoices();
    const tamilVoice = voices.find((v) => v.lang.startsWith("ta"));
    if (!tamilVoice) return false;

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "ta-IN";
    utt.voice = tamilVoice;
    utt.rate = 0.85;
    utt.onend = () => setIsPlaying(false);
    utt.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    window.speechSynthesis.speak(utt);
    return true;
  };

  const stop = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isPlaying, play, stop };
}
