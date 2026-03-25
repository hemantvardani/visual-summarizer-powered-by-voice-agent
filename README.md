# Vizzy

**Turn any webpage into an interactive visual diagram you can talk to.**

Vizzy is a Chrome extension that summarizes web pages as expandable flowcharts — and lets you explore them with your voice.

## Demo


## What it does

- **Click "Summarize"** on any webpage — Vizzy extracts the content and builds an interactive flowchart overlay
- **Expand any node** to drill deeper — each level pulls real content from the page, not filler
- **Talk to Vizzy** — a voice assistant that can search the page, expand/collapse sections, zoom, and answer questions hands-free

## Tech stack

| Layer | Tech |
|-------|------|
| Content extraction | [Firecrawl](https://firecrawl.dev) |
| Diagram intelligence | [Claude](https://anthropic.com) / [OpenAI](https://openai.com) (auto-fallback) |
| Diagram rendering | [Mermaid.js](https://mermaid.js.org) |
| Voice assistant | [ElevenLabs](https://elevenlabs.io) Conversational AI |
| Landing page | React + Tailwind + Framer Motion |
| Extension | Chrome Manifest V3, Vite |

## Project structure

```
vizzy/
├── visual-summary-ext/   # Chrome extension (popup, service worker, content script)
└── landing/              # Marketing site with waitlist
```

## Getting started

See the individual READMEs for setup:

- [Chrome Extension](visual-summary-ext/README.md)
- [Landing Page](landing/README.md)

 
