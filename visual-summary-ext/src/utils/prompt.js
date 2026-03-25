export function buildSummarizePrompt(content) {
  return `You are analyzing webpage text to build a visual summary diagram. The content may start with PAGE_OUTLINE listing headings from the page—use that as your primary map of what the page offers.

YOUR JOB (in order):
1. FIRST identify the page's section structure from PAGE_OUTLINE and PAGE_TEXT: treat h1/h2/h3 headings as the skeleton of the page.
2. Use those headings as natural node boundaries—do not invent abstract categories that are not on the page.
3. Create nodes that reflect REAL sections and topics—not invented abstractions like "Core" or "Additional types".
4. For documentation sites: each major ## (h2) heading should generally map to one top-level node; use the heading text as the label (shortened if needed). Deeper ### subsections can share a node or become separate nodes only when they are substantial on their own.
5. For list pages (products, news): one node per concrete item.

DIAGRAM STRUCTURE (important):
- The JSON field "title" is the page title/topic—the diagram renderer uses it as the central hub.
- Top-level "nodes" must be the actual main sections (or list items). Do NOT add a duplicate "root" node that repeats the page title; the title is already the root.

DIAGRAM LAYOUT:
- "flowchart LR" — PREFERRED for most pages. Root on the left, sections fan out to the right. Use this for docs, landing pages, product lists, and any page with many sibling sections.
- "flowchart TD" — ONLY use when the page has a deeply nested hierarchy (3+ levels) where top-down reading order matters. Rare.

NODE COUNT:
- Use between 5 and 8 top-level nodes. Keep the initial diagram CLEAN and readable — users can click to expand for more detail.
- Group related subsections under one node when they share a parent heading (e.g. group Flowchart, Sequence, Gantt under "Diagram Types" with expandable: true, rather than listing each as a top-level node).
- Never create a node called "Additional X", "Other Y", "Miscellaneous", or similar catch-alls — use the real heading name from the page.

TITLE:
- "title" should state what the page offers in 5–10 words (e.g. "Mermaid: text-based diagrams from markdown").

EDGES:
- Only add edges when there is a real relationship between two nodes—not decorative links.
- Do NOT repeat the same label on many edges (no ten edges all saying "supports" or "relates to").
- If sections are mostly independent, leave "edges" empty or minimal.

CONTENT CHUNKS:
- Each node's contentChunk must quote or closely paraphrase actual sentences from PAGE_TEXT for that section—not generic filler.

Return ONLY valid JSON (no markdown fences). diagramType must be exactly one of "flowchart LR" or "flowchart TD":
{
  "diagramType": "flowchart LR",
  "title": "What this page offers (5-10 words)",
  "nodes": [
    {
      "id": "n1",
      "label": "Short section or item name",
      "summary": "1-2 sentences",
      "contentChunk": "Real excerpt from the page for this section.",
      "expandable": true,
      "expanded": false,
      "children": []
    }
  ],
  "edges": []
}

RULES:
- Labels: specific (use real section names from the outline). Max ~6 words.
- ids: n1, n2, n3, … in order.
- expandable: true only if that section has enough depth to expand later.

PAGE CONTENT:
${content}`;
}

export function buildExpandPrompt(nodeLabel, nodeSummary, sectionContent) {
  return `A user is exploring a visual summary diagram and clicked on a section to drill deeper.

SECTION: "${nodeLabel}"
SUMMARY: "${nodeSummary}"

FULL SECTION CONTENT FROM THE PAGE:
${sectionContent}

Your job: read the section content above and break it into 2-5 concrete sub-points that capture the REAL details.

Return ONLY valid JSON (no markdown fences):
{
  "children": [
    {
      "id": "PARENT_ID_1",
      "label": "Specific sub-topic name",
      "summary": "1-2 sentences explaining this sub-point",
      "contentChunk": "Direct quote or close paraphrase from the section content above — include enough detail so a reader learns something concrete",
      "expandable": true,
      "expanded": false,
      "children": []
    }
  ],
  "edges": []
}

RULES:
- Each label must name a specific thing from the content, not a vague category
- contentChunk MUST contain actual text from the section content above — not invented filler. Include 2-4 sentences so the sub-point carries real knowledge
- Set expandable to true when the sub-point has any further detail that could be broken down. Prefer true over false — users can always click to explore deeper
- Use PARENT_ID_1, PARENT_ID_2 etc. as placeholder ids`;
}
