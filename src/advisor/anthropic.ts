const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export async function completeWithAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Anthropic API error ${res.status}: ${detail.slice(0, 300)}`);
  }

  const body = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = body.content?.find((c) => c.type === 'text')?.text?.trim();
  if (!text) {
    throw new Error('Anthropic API returned no text content');
  }
  return text;
}
