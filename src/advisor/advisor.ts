import type { IntelligenceResponse } from '../intelligence/types.js';

export const DISCLAIMER =
  'AI-generated prototype. Not yet reviewed by native speakers. Verify before acting.';

export const SUPPORTED_LANGUAGES = ['en', 'pcm', 'yo', 'ha', 'ig'] as const;
export type AdvisorLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<AdvisorLanguage, string> = {
  en: 'English',
  pcm: 'Nigerian Pidgin',
  yo: 'Yoruba',
  ha: 'Hausa',
  ig: 'Igbo',
};

export const LOW_CONFIDENCE_THRESHOLD = 50;

export interface AdvisorRequest {
  lat: number;
  lng: number;
  crop?: string;
  language: AdvisorLanguage;
  question?: string;
}

export interface LlmClient {
  apiKey: string;
  model: string;
  complete: (system: string, user: string) => Promise<string>;
}

export function buildSystemPrompt(language: AdvisorLanguage): string {
  return [
    'You are an agricultural advisor for farmers in Nigeria.',
    `Rewrite the agricultural intelligence data provided by the user as short, farmer-friendly advice in ${LANGUAGE_NAMES[language]} (language code: ${language}).`,
    'Rules:',
    '- Use only the data provided. Never invent numbers, dates, or facts that are not in the data.',
    '- State the confidence score from the data (0-100) in your advice.',
    '- Always say what the farmer should do next.',
    `- If the confidence score is below ${LOW_CONFIDENCE_THRESHOLD}, advise the farmer to consult a local extension officer before acting.`,
    '- Use plain words. A few short sentences. No markdown, no preamble, no translation notes.',
    '- Reply only with the advice text.',
  ].join('\n');
}

export function buildUserPrompt(input: AdvisorRequest, intelligence: IntelligenceResponse): string {
  const data = {
    location: intelligence.location,
    crop: intelligence.crop ?? input.crop ?? null,
    confidence: intelligence.confidence,
    weather: intelligence.weather?.current ?? null,
    risks: (intelligence.risks ?? []).map((r) => ({
      title: r.title,
      severity: r.severity,
      description: r.description,
    })),
    recommendations: (intelligence.recommendations ?? []).map((r) => ({
      title: r.title,
      severity: r.severity,
      description: r.description,
    })),
  };
  const question = input.question?.trim()
    ? `Farmer's question: ${input.question.trim()}`
    : 'Farmer has no specific question.';
  return `${question}\n\nAgricultural intelligence data:\n${JSON.stringify(data, null, 2)}`;
}

export function buildFallbackAdvice(intelligence: IntelligenceResponse): string {
  const loc = intelligence.location;
  const where = loc?.resolvedName
    ? `${loc.resolvedName}${loc.state ? `, ${loc.state}` : ''}`
    : `${loc?.latitude}, ${loc?.longitude}`;
  const crop = intelligence.crop ? ` for ${intelligence.crop}` : '';
  const risks = intelligence.risks ?? [];
  const recs = intelligence.recommendations ?? [];

  const parts = [
    `Here is the advice for ${where}${crop}, based on KulimaAPI data:`,
    risks.length > 0
      ? `${risks.length} active risk${risks.length === 1 ? '' : 's'}: ${risks.map((r) => r.title).join('; ')}.`
      : 'No active risks in the data.',
    recs.length > 0
      ? `Recommended next step: ${recs[0].title} — ${recs[0].description}`
      : 'No specific recommendation in the data.',
    `Confidence score: ${intelligence.confidence} out of 100.`,
  ];

  if (intelligence.confidence < LOW_CONFIDENCE_THRESHOLD) {
    parts.push('Confidence is low — consult a local extension officer before acting.');
  } else {
    parts.push('Follow the recommendation above and check again as conditions change.');
  }

  return parts.join(' ');
}

export async function generateAdvice(
  input: AdvisorRequest,
  intelligence: IntelligenceResponse,
  llm: LlmClient
): Promise<{ language: AdvisorLanguage; advice: string }> {
  if (!llm.apiKey) {
    return { language: 'en', advice: buildFallbackAdvice(intelligence) };
  }

  const advice = (
    await llm.complete(buildSystemPrompt(input.language), buildUserPrompt(input, intelligence))
  ).trim();

  if (!advice) {
    throw new Error('LLM returned empty advice');
  }

  return { language: input.language, advice };
}
