import { generateText } from 'ai';
import { createOpenAI } from 'ai/providers/openai';

// Demonstrates basic usage of the Vercel AI SDK.
// Requires the OPENAI_API_KEY environment variable.

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY not set.');
    return;
  }

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: 'Hello from Vercel AI SDK!',
  });
  console.log(text);
}

main().catch((err) => {
  console.error('Vercel AI SDK demo failed', err);
});
