# ai-sandbox

This repository contains a simple static website showcasing stringed instruments often used by folk singers. Open `index.html` in a browser to view the site.

A basic music transcriber demo is available at `transcribe.html`. The demo lets you upload or record audio, experiment with a sample musical score, and play it back. Actual audio-to-score transcription is not implemented.


After pushes to `main`, a GitHub Actions workflow publishes the site to GitHub Pages. Once the workflow succeeds and Pages is enabled in the repository settings, you can preview the site at `https://<github-username>.github.io/ai-sandbox/`.

## Vercel AI SDK Demo

This repository includes a small Node script demonstrating the [Vercel AI SDK](https://sdk.vercel.ai/).
To try it out:

1. Install dependencies with `npm install` (requires internet access).
2. Set the `OPENAI_API_KEY` environment variable.
3. Run `node vercel-demo.js` to generate a short response using OpenAI's API.
