# Visual Summary — Chrome Extension

Visually summarize any webpage as an interactive, expandable Mermaid flowchart overlaid on the page.

## Setup

```bash
cd visual-summary-ext
npm install
```

## Development (Hot Reload)

```bash
npm run dev
```

This starts Vite in watch mode — rebuilds on every file save.

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** and select the `dist/` folder
4. The extension icon appears in your toolbar

After the first load, every `npm run dev` rebuild will be picked up by Chrome automatically. If Chrome doesn't pick up changes, click the reload button on the extension card.

## Production Build

```bash
npm run build
```

## Usage

1. Click the **Visual Summary** extension icon on any webpage
2. First time: go to **Settings** and enter your **Anthropic** and **Firecrawl** API keys
3. Click **Summarize This Page**
4. A floating overlay appears at the top with a flowchart summary
5. Click any node with ⊕ to expand it (fetches more detail from Claude on demand)
6. Click an expanded node to collapse it back
7. Hover over any node to see its summary tooltip

## ElevenLabs Voice Assistant Setup

1. Install dependencies and build:

```bash
npm install
npm run build
```

2. In extension **Settings**, add:
   - Anthropic API key
   - Firecrawl API key
   - ElevenLabs Agent ID

3. Create an ElevenLabs Conversational AI agent and configure these **Client Tools** (enable "Wait for response" on each):
   - `list_nodes` (no params)
   - `expand_node` (`node_label`: string)
   - `collapse_node` (`node_label`: string)
   - `get_node_details` (`node_label`: string)
   - `search_page_content` (`query`: string)
   - `zoom_in` (no params)
   - `zoom_out` (no params)

4. Suggested system prompt:

```text
You are the voice assistant for Visual Summary, a browser extension that renders webpage content as an interactive flowchart.
Speak naturally and keep answers concise (1-3 sentences).
Use tools when needed to expand, collapse, zoom, inspect node details, or search page content.
Prefer explaining what the user should understand, not just listing actions you took.
If the page does not contain the requested information, say so clearly.
```

5. On any summarized page, click the mic button in the overlay controls. Voice stays active until you click again or leave the tab.

## Architecture

- **Popup** — small UI for triggering summarize + managing API keys
- **Service Worker** — handles Firecrawl content extraction + Claude API calls
- **Content Script** — injects the floating overlay panel, renders Mermaid diagrams
- **DiagramManager** — maintains the hierarchical JSON tree, converts to Mermaid syntax
