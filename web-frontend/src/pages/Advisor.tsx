import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mic, MicOff, Volume2, Loader2, AlertTriangle, Send } from 'lucide-react';
import { api } from '../lib/api';
import { getSetup } from '../lib/store';
import {
  LANGUAGES,
  getSpeechRecognitionCtor,
  languageLabel,
  speak,
  stopSpeaking,
} from '../lib/speech';

const DISCLAIMER_FALLBACK =
  'AI-generated prototype. Not yet reviewed by native speakers. Verify before acting.';

interface AdvisorResult {
  language: string;
  advice: string;
  confidence: number;
  dataUsed: string;
  disclaimer: string;
}

export default function Advisor() {
  const setup = getSetup()!;
  const [language, setLanguage] = useState('en');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => () => stopSpeaking(), []);

  const toggleMic = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new Ctor();
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

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setVoiceNote(null);
    stopSpeaking();
    setSpeaking(false);
    try {
      const res = await api<AdvisorResult>('/v2/advisor/explain', {
        method: 'POST',
        body: JSON.stringify({
          lat: setup.lat,
          lng: setup.lng,
          crop: setup.crop || undefined,
          language,
          question: question.trim() || undefined,
        }),
      });
      setResult(res);
      const spoken = speak(res.advice, res.language, {
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
      });
      if (!spoken.ok && spoken.note) setVoiceNote(spoken.note);
    } catch (err: any) {
      setError(err?.message || 'Failed to get advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpeak = () => {
    if (!result) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const spoken = speak(result.advice, result.language, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
    if (!spoken.ok && spoken.note) setVoiceNote(spoken.note);
  };

  const micSupported = typeof window !== 'undefined' && !!getSpeechRecognitionCtor();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sparkles size={20} className="text-leaf-600" />
          AI Advisor
        </h1>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-300">
          Prototype
        </span>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3">
        <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-800">{result?.disclaimer || DISCLAIMER_FALLBACK}</p>
      </div>

      <p className="text-xs text-gray-500">
        For {setup.name || 'your farm'} ({setup.lat.toFixed(3)}, {setup.lng.toFixed(3)}
        {setup.crop ? ` · ${setup.crop}` : ''}) — change in{' '}
        <Link to="/setup" className="text-leaf-700 font-medium underline">
          setup
        </Link>
        .
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Question (optional)
            </label>
            <button
              type="button"
              onClick={toggleMic}
              disabled={!micSupported}
              title={micSupported ? 'Ask by voice' : 'Voice input is not supported in this browser'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                !micSupported
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400'
                  : listening
                    ? 'bg-red-50 text-red-600'
                    : 'bg-leaf-50 text-leaf-700'
              }`}
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          />
          {!micSupported && (
            <p className="mt-1 text-[11px] text-gray-400">
              Voice input is not supported in this browser — type your question instead.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-leaf-600 hover:bg-leaf-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? 'Getting advice…' : 'Get advice'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Advice · {languageLabel(result.language)}
            </p>
            <button
              type="button"
              onClick={toggleSpeak}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-leaf-50 text-leaf-700"
            >
              <Volume2 size={14} />
              {speaking ? 'Stop' : 'Read aloud'}
            </button>
          </div>

          <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.advice}</p>

          {voiceNote && (
            <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{voiceNote}</p>
          )}

          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Confidence</span>
              <span className="font-semibold">{result.confidence}/100</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  result.confidence >= 70
                    ? 'bg-green-500'
                    : result.confidence >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, result.confidence))}%` }}
              />
            </div>
          </div>

          <p className="text-[10px] text-gray-400">Data used: {result.dataUsed}</p>
        </div>
      )}
    </div>
  );
}
