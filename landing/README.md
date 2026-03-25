# Vizzy landing page

Marketing site for the Vizzy Chrome extension (visual summaries + voice).

## Setup

```bash
cd landing
npm install
```

## Waitlist (Formspree)

1. Create a form at [formspree.io](https://formspree.io).
2. Copy `.env.example` to `.env` and set:

```env
VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/your_form_id
```

3. Rebuild so Vite embeds the env var.

## Dev

```bash
npm run dev
```

## Production build

```bash
npm run build
```

Output: `dist/` — deploy to Vercel, Netlify, or any static host.
