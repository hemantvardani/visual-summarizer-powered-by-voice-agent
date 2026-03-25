import { buildSummarizePrompt, buildExpandPrompt } from "../utils/prompt.js";
import {
  finalizeForLLM,
  splitBySections,
  matchSection,
  previewForLog,
} from "../utils/page-content.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ServiceWorker");

const pageContentCache = new Map();

const CACHE_VERSION = "v2";
const TREE_CACHE_PREFIX = "tree_cache_";
const CONTENT_CACHE_PREFIX = `content_cache_${CACHE_VERSION}_`;

function cacheKey(prefix, url) {
  return prefix + btoa(url).slice(0, 60);
}

async function getCachedContent(url) {
  const key = cacheKey(CONTENT_CACHE_PREFIX, url);
  const result = await chrome.storage.local.get(key);
  const found = result[key] || null;
  log.debug("getCachedContent", { url, found: !!found });
  return found;
}

async function setCachedContent(url, content) {
  const key = cacheKey(CONTENT_CACHE_PREFIX, url);
  await chrome.storage.local.set({ [key]: content });
  log.debug("setCachedContent", { url, length: content?.length });
}

async function getKeys() {
  const keys = await chrome.storage.local.get(["anthropicKey", "openaiKey", "firecrawlKey"]);
  log.debug("getKeys", {
    hasAnthropic: !!keys.anthropicKey,
    hasOpenAI: !!keys.openaiKey,
    hasFirecrawl: !!keys.firecrawlKey,
  });
  return keys;
}

async function fetchPageContent(url, firecrawlKey, { forceRefresh = false } = {}) {
  if (!forceRefresh && pageContentCache.has(url)) {
    log.info("fetchPageContent: MEMORY CACHE HIT", { url });
    return finalizeForLLM(pageContentCache.get(url)).text;
  }

  if (!forceRefresh) {
    const cached = await getCachedContent(url);
    if (cached) {
      log.info("fetchPageContent: STORAGE CACHE HIT", { url, length: cached.length });
      pageContentCache.set(url, cached);
      return finalizeForLLM(cached).text;
    }
  }

  log.info("fetchPageContent: FETCHING from Firecrawl", { url });
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${firecrawlKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      excludeTags: ["pre", "code", "svg", "img", "footer", "nav"],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    log.error("fetchPageContent: Firecrawl FAILED", { status: response.status, err });
    throw new Error(`Firecrawl error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const content = data.data?.markdown || "";

  if (!content) {
    log.error("fetchPageContent: Firecrawl returned EMPTY content", { url });
    throw new Error("Firecrawl returned empty content");
  }

  const { text: finalized, preprocessedLength } = finalizeForLLM(content);
  log.success("fetchPageContent: Got content", {
    url,
    originalLength: content.length,
    afterPreprocessLength: preprocessedLength,
    finalizedLength: finalized.length,
  });
  log.console("PIPELINE: Firecrawl raw markdown (preview)", {
    url,
    length: content.length,
    preview: previewForLog(content, 1500),
  });

  pageContentCache.set(url, content);
  await setCachedContent(url, content);
  return finalized;
}

async function callClaude(prompt, anthropicKey, { debugContext = "claude" } = {}) {
  log.info("callClaude: Sending request", { promptLength: prompt.length, debugContext });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    log.error("callClaude: API FAILED", { status: response.status, err });
    throw new Error(`Claude error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  log.success("callClaude: Got response", {
    responseLength: text.length,
    usage: data.usage,
    debugContext,
  });
  log.console(`PIPELINE: Claude raw response [${debugContext}] (preview)`, {
    length: text.length,
    preview: previewForLog(text, 2000),
  });
  return text;
}

async function callOpenAI(prompt, openaiKey, { debugContext = "openai" } = {}) {
  log.info("callOpenAI: Sending request", { promptLength: prompt.length, debugContext });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    log.error("callOpenAI: API FAILED", { status: response.status, err });
    throw new Error(`OpenAI error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  log.success("callOpenAI: Got response", {
    responseLength: text.length,
    usage: data.usage,
    debugContext,
  });
  log.console(`PIPELINE: OpenAI raw response [${debugContext}] (preview)`, {
    length: text.length,
    preview: previewForLog(text, 2000),
  });
  return text;
}

async function callLLM(prompt, keys, { debugContext = "llm" } = {}) {
  if (keys.anthropicKey) {
    const text = await callClaude(prompt, keys.anthropicKey, { debugContext });
    return { text, provider: "anthropic" };
  }

  if (keys.openaiKey) {
    const text = await callOpenAI(prompt, keys.openaiKey, { debugContext });
    return { text, provider: "openai" };
  }

  throw new Error("No LLM key configured. Add Anthropic or OpenAI key.");
}

function parseJSON(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    const parsed = JSON.parse(cleaned);
    log.debug("parseJSON: SUCCESS", { keys: Object.keys(parsed) });
    return parsed;
  } catch (err) {
    log.error("parseJSON: FAILED", {
      error: err.message,
      first200chars: cleaned.slice(0, 200),
    });
    throw err;
  }
}

const PIPELINE_PREFIX = "vs_pipeline_";

function pipelineKey(url) {
  return PIPELINE_PREFIX + btoa(url).slice(0, 60);
}

async function savePipelineSnapshot(url, snapshot) {
  const key = pipelineKey(url);
  await chrome.storage.local.set({ [key]: snapshot });
  log.debug("savePipelineSnapshot", { url, key });
}

async function handleSummarize(url, forceRefresh = false) {
  log.info("handleSummarize: START", { url, forceRefresh });

  const keys = await getKeys();
  if ((!keys.anthropicKey && !keys.openaiKey) || !keys.firecrawlKey) {
    log.error("handleSummarize: MISSING API KEYS");
    return { error: "API keys not configured. Add Firecrawl and either Anthropic or OpenAI key in Settings." };
  }

  try {
    log.info("handleSummarize: Fetching page content...");
    const content = await fetchPageContent(url, keys.firecrawlKey, { forceRefresh });
    const rawMarkdown = pageContentCache.get(url) || "";

    log.info("handleSummarize: Calling LLM for summarization...");
    const prompt = buildSummarizePrompt(content);
    const { text: rawResponse, provider } = await callLLM(prompt, keys, {
      debugContext: "summarize",
    });
    const tree = parseJSON(rawResponse);

    const sections = splitBySections(content);
    log.debug("handleSummarize: Split into sections", {
      count: sections.length,
      headings: sections.map((s) => s.heading),
    });

    const sectionMatches = {};
    tree.nodes = tree.nodes.map((node) => {
      const match = matchSection(node.label, sections);
      const sectionContent = match?.content || "";
      if (match) sectionMatches[node.label] = match.heading;
      const hasContent = sectionContent.length > 30 || (node.contentChunk && node.contentChunk.length > 30);
      return {
        ...node,
        expandable: node.expandable || hasContent,
        expanded: false,
        children: node.children || [],
        contentChunk: node.contentChunk || "",
        sectionContent,
      };
    });

    if (!tree.edges) tree.edges = [];
    if (!tree.diagramType) tree.diagramType = "flowchart LR";

    log.success("handleSummarize: COMPLETE", {
      title: tree.title,
      diagramType: tree.diagramType,
      nodeCount: tree.nodes.length,
      edgeCount: tree.edges.length,
      nodeLabels: tree.nodes.map((n) => n.label),
      sectionMatches,
      llmProvider: provider,
    });

    savePipelineSnapshot(url, {
      url,
      timestamp: new Date().toISOString(),
      firecrawlRaw: previewForLog(rawMarkdown, 3000),
      preprocessed: previewForLog(content, 3000),
      claudeResponse: previewForLog(rawResponse, 3000),
      llmProvider: provider,
      sections: sections.map((s) => ({ heading: s.heading, length: s.content.length })),
      nodeLabels: tree.nodes.map((n) => n.label),
      sectionMatches,
    }).catch((err) => log.warn("savePipelineSnapshot failed", { error: err.message }));

    return { tree };
  } catch (err) {
    log.error("handleSummarize: FAILED", { error: err.message, stack: err.stack });
    return { error: err.message };
  }
}

async function handleExpand(nodeId, nodeSummary, nodeLabel, nodeContent, sectionContent) {
  const bestContent = sectionContent || nodeContent || nodeSummary;
  log.info("handleExpand: START", {
    nodeId, nodeLabel,
    hasSectionContent: !!sectionContent,
    hasNodeContent: !!nodeContent,
    bestContentLength: bestContent?.length,
  });

  const keys = await getKeys();
  if (!keys.anthropicKey && !keys.openaiKey) {
    log.error("handleExpand: MISSING LLM key");
    return { error: "No LLM key configured. Add Anthropic or OpenAI key." };
  }

  try {
    const prompt = buildExpandPrompt(nodeLabel, nodeSummary, bestContent);
    const { text: rawResponse, provider } = await callLLM(prompt, keys, {
      debugContext: "expand-node",
    });
    const result = parseJSON(rawResponse);

    log.success("handleExpand: COMPLETE", {
      nodeId,
      childCount: result.children?.length,
      childLabels: result.children?.map((c) => c.label),
      llmProvider: provider,
    });

    return { children: result.children || [], edges: result.edges || [] };
  } catch (err) {
    log.error("handleExpand: FAILED", { error: err.message, stack: err.stack });
    return { error: err.message };
  }
}

async function sendToContentScript(tabId, message) {
  try {
    log.info("sendToContentScript: Sending message", { tabId, type: message.type });
    const response = await chrome.tabs.sendMessage(tabId, message);
    log.success("sendToContentScript: Response received", { response });
    return response;
  } catch (err) {
    log.error("sendToContentScript: FAILED", {
      tabId,
      error: err.message,
      hint: "Content script may not be loaded. Try a regular webpage.",
    });
    throw new Error(
      `Could not reach content script. Make sure you're on a regular webpage. Error: ${err.message}`
    );
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log.info("MESSAGE RECEIVED", { type: message.type, from: sender?.tab?.url || "popup" });

  if (message.type === "SUMMARIZE_PAGE") {
    handleSummarize(message.url, message.forceRefresh || false)
      .then(async (result) => {
        if (result.error) {
          sendResponse(result);
          return;
        }
        try {
          await sendToContentScript(message.tabId, {
            type: "RENDER_DIAGRAM",
            tree: result.tree,
            url: message.url,
          });
          sendResponse(result);
        } catch (err) {
          sendResponse({ error: err.message });
        }
      })
      .catch((err) => {
        log.error("SUMMARIZE_PAGE: Unexpected error", { error: err.message });
        sendResponse({ error: err.message });
      });
    return true;
  }

  if (message.type === "EXPAND_NODE") {
    handleExpand(
      message.nodeId,
      message.nodeSummary,
      message.nodeLabel,
      message.nodeContent,
      message.sectionContent
    ).then(sendResponse);
    return true;
  }

  if (message.type === "SAVE_TREE") {
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "DUMP_LOGS") {
    log.dumpLogs().then((logs) => sendResponse({ logs }));
    return true;
  }

  if (message.type === "CLEAR_LOGS") {
    log.clearLogs().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.type === "DUMP_PIPELINE") {
    const key = pipelineKey(message.url);
    chrome.storage.local.get(key, (result) => {
      sendResponse({ snapshot: result[key] || null });
    });
    return true;
  }
});

chrome.storage.local.get(null, (items) => {
  const staleKeys = Object.keys(items).filter((k) => {
    if (k.startsWith(TREE_CACHE_PREFIX)) return true;
    if (k.startsWith("content_cache_") && !k.startsWith(CONTENT_CACHE_PREFIX)) return true;
    return false;
  });
  if (staleKeys.length) {
    chrome.storage.local.remove(staleKeys, () => {
      log.info("Startup: cleared stale cache entries", { count: staleKeys.length, keys: staleKeys });
    });
  }
});

log.info("Service worker LOADED");
