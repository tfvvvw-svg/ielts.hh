import { useCallback, useEffect, useRef, useState } from 'react';

/** Browser speech-to-text for dictation. Returns null where unsupported. */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = () => recognitionCtor() !== null;

export function useDictation(onFinal: (text: string) => void) {
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    rec.current?.stop();
    rec.current = null;
    setActive(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) { setError('Dictation is not supported in this browser.'); return; }
    const r = new Ctor();
    r.lang = 'en-GB';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
      if (parts.length) onFinal(parts.join(' '));
    };
    r.onend = () => setActive(false);
    r.onerror = () => { setError('Dictation stopped unexpectedly. You can keep typing instead.'); setActive(false); };
    try { r.start(); rec.current = r; setActive(true); setError(null); }
    catch { setError('Could not start dictation. Please check microphone permissions.'); }
  }, [onFinal]);

  useEffect(() => () => { rec.current?.stop(); }, []);

  return { active, error, start, stop };
}