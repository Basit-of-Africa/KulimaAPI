import { describe, it, expect, vi } from 'vitest';
import {
  DISCLAIMER,
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  LOW_CONFIDENCE_THRESHOLD,
  buildSystemPrompt,
  buildUserPrompt,
  buildFallbackAdvice,
  generateAdvice,
  type AdvisorRequest,
} from './advisor.js';
import type { IntelligenceResponse } from '../intelligence/types.js';

function makeIntelligence(overrides: Partial<IntelligenceResponse> = {}): IntelligenceResponse {
  return {
    location: { latitude: 6.5, longitude: 3.4, resolvedName: 'Ikeja', state: 'Lagos' },
    weather: {
      current: { temperatureC: 28, humidityPercent: 75, precipitationMm: 12 },
      source: 'open-meteo',
      retrievedAt: '2026-11-01T12:00:00.000Z',
    },
    risks: [
      {
        category: 'water',
        severity: 'high',
        title: 'Heavy rain risk',
        description: 'Heavy rain expected within 48 hours',
        evidence: {},
        confidence: 80,
        triggeredBy: ['rule-rain'],
      },
    ],
    recommendations: [
      {
        id: 'rec-1',
        category: 'water',
        title: 'Delay planting',
        description: 'Wait 3 days before planting to avoid waterlogged soil',
        severity: 'medium',
        reason: 'Heavy rain expected',
        evidence: {},
        confidence: 80,
        validFrom: '2026-11-01T00:00:00.000Z',
        validUntil: '2026-11-02T00:00:00.000Z',
      },
    ],
    confidence: 72,
    crop: 'maize',
    generatedAt: '2026-11-01T12:00:00.000Z',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<AdvisorRequest> = {}): AdvisorRequest {
  return { lat: 6.5, lng: 3.4, crop: 'maize', language: 'yo', ...overrides };
}

describe('Advisor prompt building', () => {
  describe('buildSystemPrompt', () => {
    it('names the target language for every supported language', () => {
      for (const language of SUPPORTED_LANGUAGES) {
        const prompt = buildSystemPrompt(language);
        expect(prompt).toContain(LANGUAGE_NAMES[language]);
        expect(prompt).toContain(`language code: ${language}`);
      }
    });

    it('tells the model to use only the provided data and never invent numbers', () => {
      const prompt = buildSystemPrompt('en');
      expect(prompt).toMatch(/use only the data provided/i);
      expect(prompt).toMatch(/never invent numbers/i);
    });

    it('requires stating the confidence score', () => {
      expect(buildSystemPrompt('en')).toMatch(/state the confidence score/i);
    });

    it('requires saying what to do next', () => {
      expect(buildSystemPrompt('en')).toMatch(/what the farmer should do next/i);
    });

    it('requires advising an extension officer when confidence is low', () => {
      const prompt = buildSystemPrompt('en');
      expect(prompt).toMatch(/extension officer/i);
      expect(prompt).toContain(String(LOW_CONFIDENCE_THRESHOLD));
    });
  });

  describe('buildUserPrompt', () => {
    it('includes the farmer question when provided', () => {
      const prompt = buildUserPrompt(makeRequest({ question: 'Should I plant this week?' }), makeIntelligence());
      expect(prompt).toContain("Farmer's question: Should I plant this week?");
    });

    it('says there is no specific question when none is provided', () => {
      const prompt = buildUserPrompt(makeRequest(), makeIntelligence());
      expect(prompt).toContain('no specific question');
    });

    it('includes the intelligence data: confidence, risks, recommendations, crop', () => {
      const prompt = buildUserPrompt(makeRequest(), makeIntelligence());
      expect(prompt).toContain('"confidence": 72');
      expect(prompt).toContain('Heavy rain risk');
      expect(prompt).toContain('Delay planting');
      expect(prompt).toContain('"crop": "maize"');
      expect(prompt).toContain('Ikeja');
    });
  });

  describe('generateAdvice with an LLM', () => {
    it('calls the LLM with system and user prompts and returns its answer', async () => {
      const complete = vi.fn().mockResolvedValue('  Plante après la pluie.  ');
      const result = await generateAdvice(makeRequest({ language: 'yo' }), makeIntelligence(), {
        apiKey: 'test-key',
        model: 'test-model',
        complete,
      });

      expect(complete).toHaveBeenCalledOnce();
      const [system, user] = complete.mock.calls[0];
      expect(system).toContain('Yoruba');
      expect(user).toContain('"confidence": 72');
      expect(result).toEqual({ language: 'yo', advice: 'Plante après la pluie.' });
    });

    it('throws when the LLM returns an empty answer', async () => {
      const complete = vi.fn().mockResolvedValue('   ');
      await expect(
        generateAdvice(makeRequest(), makeIntelligence(), {
          apiKey: 'test-key',
          model: 'test-model',
          complete,
        })
      ).rejects.toThrow('LLM returned empty advice');
    });
  });
});

describe('No-key fallback', () => {
  it('returns a plain English template and never calls the LLM when no API key is set', async () => {
    const intelligence = makeIntelligence();
    const complete = vi.fn();

    const result = await generateAdvice(makeRequest({ language: 'ha' }), intelligence, {
      apiKey: '',
      model: 'test-model',
      complete,
    });

    expect(complete).not.toHaveBeenCalled();
    expect(result.language).toBe('en');
    expect(result.advice).toBe(buildFallbackAdvice(intelligence));
    expect(result.advice).toContain('Confidence score: 72 out of 100.');
    expect(result.advice).toContain('Heavy rain risk');
    expect(result.advice).toContain('Delay planting');
  });

  it('does not advise an extension officer when confidence is high', () => {
    const advice = buildFallbackAdvice(makeIntelligence({ confidence: 72 }));
    expect(advice).not.toMatch(/extension officer/i);
  });

  it('advises consulting an extension officer when confidence is low', () => {
    const advice = buildFallbackAdvice(makeIntelligence({ confidence: 40 }));
    expect(advice).toMatch(/consult a local extension officer/i);
    expect(advice).toContain('Confidence score: 40 out of 100.');
  });

  it('describes only what exists in the intelligence data', () => {
    const advice = buildFallbackAdvice(makeIntelligence({ confidence: 72 }));
    expect(advice).toContain('1 active risk:');
    expect(advice).toContain('Here is the advice for Ikeja, Lagos for maize');
    expect(advice).not.toMatch(/no active risks/i);
  });
});

describe('Disclaimer', () => {
  it('is exactly the required text', () => {
    expect(DISCLAIMER).toBe(
      'AI-generated prototype. Not yet reviewed by native speakers. Verify before acting.'
    );
  });
});
