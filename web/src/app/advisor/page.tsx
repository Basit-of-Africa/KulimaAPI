'use client';

import { withAuth } from '@/components/withAuth';
import { useEffect, useRef, useState } from 'react';
import { LocationPicker } from '@/components/LocationPicker';
import { explainAdvisor, getCrops } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Sparkles, Mic, MicOff, Volume2, Loader2, AlertTriangle, Send,
} from 'lucide-react';

const DISCLAIMER_FALLBACK =
  'AI-generated prototype. Not yet reviewed by native speakers. Verify before acting.';

const LANGUAGES = [
  { code: 'en', label: 'English', voiceLang: 'en-NG', recognitionLang: 'en-NG' },
  { code: 'pcm', label: 'Nigerian Pidgin', voiceLang: 'pcm-NG', recognitionLang: 'en-NG' },
  { code: 'yo', label: 'Yoruba', voiceLang: 'yo-NG', recognitionLang: 'yo-NG' },
  { code: 'ha', label: 'Hausa', voiceLang: 'ha-NG', recognitionLang: 'ha-NG' },
  { code: 'ig', label: 'Igbo', voiceLang: 'ig-NG', recognitionLang: 'ig-NG' },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]['code'];

interface AdvisorResult {
  language: string;
  advice: string;
  confidence: number;
  dataUsed: string;
  disclaimer: string;
}

function AdvisorPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number; name?: string } | null>(null);
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [crop, setCrop] = useState('');
  const [crops, setCrops] = useState<string[]>([]);
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    getCrops()
      .then((data: any) => setCrops((data.crops || []).map((c: any) => c.name)))
      .catch(() => setCrops([]));
  }, []);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setMicSupported(!!SR);

    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    synth.addEventListener('voiceschanged', loadVoices);
    return () => synth.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    if (location) {
      setLatText(String(location.lat));
      setLngText(String(location.lng));
    }
  }, [location]);

  const voiceFor = (code: string): SpeechSynthesisVoice | null => {
    const lang = LANGUAGES.find((l) => l.code === code);
    if (!lang) return null;
    const tag = lang.voiceLang.toLowerCase();
    const base = tag.split('-')[0];
    return (
      voices.find((v) => v.lang.replace('_', '-').toLowerCase() === tag) ||
      voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base)) ||
      null
    );
  };

  const speak = (text: string, code: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const label = LANGUAGES.find((l) => l.code === code)?.label || code;
    const voice = voiceFor(code);
    if (!voice) {
      setVoiceNote(`No ${label} voice is available in this browser — showing the text instead.`);
      setSpeaking(false);
      return;
    }
    setVoiceNote(null);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (result?.advice) speak(result.advice, result.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const toggleMic = () => {
    if (!micSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = LANGUAGES.find((l) => l.code === language)?.recognitionLang || 'en-NG';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string;
      setQuestion((prev) => (prev.trim() ? `${prev.trim()} ${transcript}` : transcript));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const handleCoordBlur = () => {
    const lat = parseFloat(latText);
    const lng = parseFloat(lngText);
    if (!Number.isNaN(lat) && !Number.isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      setLocation({ lat, lng, name: location?.name });
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      setError('Pick a location first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setVoiceNote(null);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    try {
      const res = await explainAdvisor({
        lat: location.lat,
        lng: location.lng,
        crop: crop || undefined,
        language,
        question: question.trim() || undefined,
      });
      setResult(res as AdvisorResult);
    } catch (err: any) {
      setError(err?.message || 'Failed to get advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeak = () => {
    if (!result) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    speak(result.advice, result.language);
  };

  const resultLanguageLabel =
    LANGUAGES.find((l) => l.code === result?.language)?.label || result?.language || '';

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles size={24} className="text-kulima-500" />
            AI Advisor
          </h1>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
            Prototype
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Short, farmer-friendly advice generated from KulimaAPI intelligence data.
        </p>
      </div>

      {/* Disclaimer — always visible */}
      <div className="mb-6 flex items-start gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3">
        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {result?.disclaimer || DISCLAIMER_FALLBACK}
        </p>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4 mb-6">
        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Location
          </label>
          <LocationPicker value={location} onChange={setLocation} />
          <div className="mt-2 grid grid-cols-2 gap-3">
            <input
              value={latText}
              onChange={(e) => setLatText(e.target.value)}
              onBlur={handleCoordBlur}
              placeholder="Latitude (e.g. 6.52)"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <input
              value={lngText}
              onChange={(e) => setLngText(e.target.value)}
              onBlur={handleCoordBlur}
              placeholder="Longitude (e.g. 3.38)"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          {location && (
            <p className="mt-1.5 text-xs text-gray-400">
              {location.name ? `${location.name} — ` : ''}
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Crop + Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Crop
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">No specific crop</option>
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Question + mic */}
        <div>
          <div className="flex items-center justify-between mb-2 gap-2">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Question (optional)
            </label>
            <button
              type="button"
              onClick={toggleMic}
              disabled={!micSupported}
              title={micSupported ? 'Ask by voice' : 'Voice input is not supported in this browser'}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                !micSupported && 'opacity-50 cursor-not-allowed',
                listening
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400'
                  : 'bg-kulima-50 text-kulima-700 dark:bg-kulima-950/40 dark:text-kulima-400 hover:bg-kulima-100 dark:hover:bg-kulima-950'
              )}
            >
              {listening ? <MicOff size={14} className="animate-pulse" /> : <Mic size={14} />}
              {listening ? 'Listening…' : 'Ask by voice'}
            </button>
          </div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="e.g. Should I plant this week?"
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          />
          {!micSupported && (
            <p className="mt-1 text-[11px] text-gray-400">
              Voice input is not supported in this browser — type your question instead.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !location}
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-kulima-600 hover:bg-kulima-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? 'Getting advice…' : 'Get advice'}
        </button>
        {!location && (
          <p className="text-center text-xs text-gray-400">Pick a location to continue.</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
              Advice · {resultLanguageLabel}
            </h2>
            <button
              type="button"
              onClick={toggleSpeak}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-kulima-50 text-kulima-700 dark:bg-kulima-950/40 dark:text-kulima-400 hover:bg-kulima-100 dark:hover:bg-kulima-950 transition-colors"
            >
              <Volume2 size={14} />
              {speaking ? 'Stop' : 'Read aloud'}
            </button>
          </div>

          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
            {result.advice}
          </p>

          {voiceNote && (
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              {voiceNote}
            </p>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              <span>Confidence</span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {result.confidence}/100
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  result.confidence >= 70
                    ? 'bg-green-500'
                    : result.confidence >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                )}
                style={{ width: `${Math.min(100, Math.max(0, result.confidence))}%` }}
              />
            </div>
          </div>

          <p className="mt-3 text-[11px] text-gray-400">Data used: {result.dataUsed}</p>
        </div>
      )}
    </div>
  );
}

export default withAuth(AdvisorPage);
