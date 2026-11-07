export interface LanguageOption {
  code: string;
  label: string;
  voiceLang: string;
  recognitionLang: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', voiceLang: 'en-NG', recognitionLang: 'en-NG' },
  { code: 'pcm', label: 'Nigerian Pidgin', voiceLang: 'pcm-NG', recognitionLang: 'en-NG' },
  { code: 'yo', label: 'Yoruba', voiceLang: 'yo-NG', recognitionLang: 'yo-NG' },
  { code: 'ha', label: 'Hausa', voiceLang: 'ha-NG', recognitionLang: 'ha-NG' },
  { code: 'ig', label: 'Igbo', voiceLang: 'ig-NG', recognitionLang: 'ig-NG' },
];

export function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.label || code;
}

export function voiceFor(code: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const lang = LANGUAGES.find((l) => l.code === code);
  if (!lang) return null;
  const voices = window.speechSynthesis.getVoices();
  const tag = lang.voiceLang.toLowerCase();
  const base = tag.split('-')[0];
  return (
    voices.find((v) => v.lang.replace('_', '-').toLowerCase() === tag) ||
    voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base)) ||
    null
  );
}

export interface SpeakResult {
  ok: boolean;
  note?: string;
}

/** Speak text in the voice for `code`; returns a user-facing note when no voice exists. */
export function speak(
  text: string,
  code: string,
  handlers: { onStart?: () => void; onEnd?: () => void } = {}
): SpeakResult {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { ok: false, note: 'This browser does not support reading aloud — showing the text instead.' };
  }
  window.speechSynthesis.cancel();
  const voice = voiceFor(code);
  if (!voice) {
    return {
      ok: false,
      note: `No ${languageLabel(code)} voice is available in this browser — showing the text instead.`,
    };
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.onstart = handlers.onStart ?? null;
  utterance.onend = handlers.onEnd ?? null;
  utterance.onerror = handlers.onEnd ?? null;
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

type SpeechRecognitionCtor = new () => any;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
