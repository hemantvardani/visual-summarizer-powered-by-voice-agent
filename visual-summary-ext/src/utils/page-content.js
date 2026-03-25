/** Max characters sent to Claude after preprocessing (keep start of doc). */
export const MAX_LLM_CONTENT_CHARS = 15000;

/**
 * Strip noise from markdown and prepend a heading outline so the LLM sees structure first.
 * @param {string} markdown
 * @returns {string}
 */
export function preprocessContent(markdown) {
  if (!markdown || typeof markdown !== "string") return "";

  const original = markdown;

  const headingLines = [];
  for (const line of original.split("\n")) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].replace(/\s+#\s*$/, "").trim();
      if (text) headingLines.push(`${"#".repeat(level)} ${text}`);
    }
  }

  let s = original;
  s = s.replace(/```[\w]*\n[\s\S]*?```/g, "\n");
  s = s.replace(/```[\s\S]*?```/g, "\n");
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt) => (alt ? `[image: ${alt}]` : ""));
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/\[\]\([^)]*\)/g, "");
  s = s.replace(/<[^>]+>/g, " ");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{4,}/g, "\n\n\n");
  s = s.trim();

  const outline =
    headingLines.length > 0
      ? `## PAGE_OUTLINE (use these as your primary section map)\n${headingLines.slice(0, 50).join("\n")}\n\n---\n\n## PAGE_TEXT\n\n`
      : "";

  return (outline + s).trim();
}

/**
 * Preprocess then cap length for the LLM (keeps document start; drops tail if over limit).
 * Returns { text, preprocessedLength } so callers can log without re-running preprocessing.
 * @param {string} rawMarkdown
 * @returns {{ text: string, preprocessedLength: number }}
 */
export function finalizeForLLM(rawMarkdown) {
  const processed = preprocessContent(rawMarkdown);
  if (processed.length <= MAX_LLM_CONTENT_CHARS) {
    return { text: processed, preprocessedLength: processed.length };
  }
  const head = processed.slice(0, MAX_LLM_CONTENT_CHARS);
  const tailNote =
    "\n\n[Document trimmed: bottom omitted to fit context. Prefer sections listed in PAGE_OUTLINE.]";
  return { text: head + tailNote, preprocessedLength: processed.length };
}

/**
 * Split preprocessed markdown into sections keyed by heading text.
 * Runs a single pass over lines — no heavy regex.
 * @param {string} preprocessed  Output of preprocessContent (includes PAGE_OUTLINE prefix)
 * @returns {Array<{ heading: string, level: number, content: string }>}
 */
export function splitBySections(preprocessed) {
  if (!preprocessed) return [];

  const lines = preprocessed.split("\n");
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith("## PAGE_OUTLINE") || line === "---" || line.startsWith("## PAGE_TEXT")) {
      continue;
    }
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      if (current) {
        current.content = current.content.trim();
        sections.push(current);
      }
      current = { heading: m[2].trim(), level: m[1].length, content: "" };
    } else if (current) {
      current.content += line + "\n";
    }
  }
  if (current) {
    current.content = current.content.trim();
    sections.push(current);
  }
  return sections;
}

/**
 * Fuzzy-match a node label to the closest section heading.
 * Tries exact include first, then word-overlap scoring.
 * @param {string} label
 * @param {Array<{ heading: string, level: number, content: string }>} sections
 * @returns {{ heading: string, content: string } | null}
 */
export function matchSection(label, sections) {
  if (!label || !sections?.length) return null;
  const q = label.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();

  const exact = sections.find(
    (s) => s.heading.toLowerCase().includes(q) || q.includes(s.heading.toLowerCase()),
  );
  if (exact) return exact;

  const words = q.split(/\s+/).filter(Boolean);
  let best = null;
  let bestScore = 0;
  for (const s of sections) {
    const h = s.heading.toLowerCase();
    const score = words.reduce((sum, w) => sum + (h.includes(w) ? 1 : 0), 0);
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

/** Safe preview for logs (avoids huge chrome.storage entries). */
export function previewForLog(text, maxChars = 1200) {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n… [+${text.length - maxChars} more chars]`;
}
