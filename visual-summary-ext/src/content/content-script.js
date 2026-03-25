import mermaid from "mermaid";
import { DiagramManager } from "../utils/diagram-manager.js";
import { createLogger } from "../utils/logger.js";
import { VoiceAgent } from "./voice-agent.js";

try { chrome.storage.local.remove("vs_debug_logs"); } catch {}

const log = createLogger("ContentScript");

const dm = new DiagramManager();
let currentUrl = "";
let overlayEl = null;
let tooltipEl = null;
let zoomLevel = 1.35;
let voiceAgent = null;
const ZOOM_STEP = 0.05;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;

function getContentCacheKey(url) {
  return "content_cache_v2_" + btoa(url).slice(0, 60);
}

async function getCachedPageContent() {
  if (!currentUrl) return "";
  const key = getContentCacheKey(currentUrl);
  const result = await chrome.storage.local.get(key);
  return result[key] || "";
}

function initMermaid() {
  log.info("Initializing Mermaid.js");
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: "basis",
    },
    mindmap: {
      useMaxWidth: false,
    },
    securityLevel: "loose",
  });
  log.success("Mermaid.js initialized");
}

function createOverlay() {
  if (overlayEl) {
    log.debug("Overlay already exists, skipping creation");
    return;
  }

  log.info("Creating floating overlay");

  overlayEl = document.createElement("div");
  overlayEl.id = "vs-overlay";
  overlayEl.innerHTML = `
    <div class="vs-panel">
      <div class="vs-minimized-pill" id="vs-expand-pill">
        <span>Visual Summary</span>
      </div>
      <div class="vs-diagram-area" id="vs-diagram"></div>
      <div class="vs-float-controls">
        <button class="vs-float-btn vs-mic-btn" id="vs-mic-btn" title="Voice assistant">\u{1F399}</button>
        <button class="vs-float-btn" id="vs-zoom-out" title="Zoom out">\u2212</button>
        <span class="vs-zoom-label" id="vs-zoom-label">135%</span>
        <button class="vs-float-btn" id="vs-zoom-in" title="Zoom in">+</button>
        <button class="vs-float-btn" id="vs-fit-btn" title="Fit to width">Fit</button>
        <button class="vs-float-btn" id="vs-log-btn" title="Toggle debug logs">\u{1F4CB}</button>
        <button class="vs-float-btn" id="vs-minimize-btn" title="Minimize">\u2015</button>
        <button class="vs-float-btn" id="vs-close-btn" title="Close">\u2715</button>
      </div>
    </div>
    <button class="vs-vizzy-dock" id="vs-vizzy-dock" title="Vizzy voice assistant" aria-pressed="false">
      <span class="vs-vizzy-icon">\u{1F399}</span>
      <span class="vs-vizzy-text">Vizzy</span>
    </button>
    <div class="vs-node-tooltip" id="vs-tooltip"></div>
    <div class="vs-debug-panel" id="vs-debug-panel" style="display:none;">
      <div class="vs-debug-header">
        <span>Debug Logs</span>
        <div class="vs-debug-actions">
          <button class="vs-debug-btn" id="vs-debug-refresh">Refresh</button>
          <button class="vs-debug-btn" id="vs-debug-copy">Copy</button>
          <button class="vs-debug-btn" id="vs-debug-clear">Clear</button>
          <button class="vs-debug-btn" id="vs-debug-close">\u2715</button>
        </div>
      </div>
      <div class="vs-debug-body" id="vs-debug-body"></div>
    </div>
  `;

  document.body.appendChild(overlayEl);
  tooltipEl = document.getElementById("vs-tooltip");

  document.getElementById("vs-minimize-btn").addEventListener("click", toggleMinimize);
  document.getElementById("vs-close-btn").addEventListener("click", closeOverlay);
  document.getElementById("vs-expand-pill").addEventListener("click", toggleMinimize);
  document.getElementById("vs-zoom-in").addEventListener("click", () => applyZoom(1));
  document.getElementById("vs-zoom-out").addEventListener("click", () => applyZoom(-1));
  document.getElementById("vs-fit-btn").addEventListener("click", fitToWidth);
  document.getElementById("vs-log-btn").addEventListener("click", toggleDebugPanel);
  document.getElementById("vs-debug-refresh").addEventListener("click", refreshDebugLogs);
  document.getElementById("vs-debug-copy").addEventListener("click", copyDebugLogs);
  document.getElementById("vs-debug-clear").addEventListener("click", clearDebugLogs);
  document.getElementById("vs-debug-close").addEventListener("click", toggleDebugPanel);
  document.getElementById("vs-mic-btn").addEventListener("click", toggleVoiceAssistant);
  document.getElementById("vs-vizzy-dock").addEventListener("click", toggleVoiceAssistant);

  const diagramArea = document.getElementById("vs-diagram");
  let lastWheelZoom = 0;
  diagramArea.addEventListener("wheel", (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelZoom < 80) return;
      lastWheelZoom = now;
      applyZoom(e.deltaY < 0 ? 1 : -1);
    }
  }, { passive: false });

  setupDrag();
  setupVoiceAgent();

  log.success("Floating overlay created");
}

function applyZoom(direction) {
  zoomLevel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomLevel + direction * ZOOM_STEP));
  zoomLevel = Math.round(zoomLevel * 100) / 100;

  const wrapper = document.querySelector("#vs-diagram .vs-zoom-wrapper");
  if (wrapper) {
    wrapper.style.transform = `scale(${zoomLevel})`;
  }

  const label = document.getElementById("vs-zoom-label");
  if (label) label.textContent = Math.round(zoomLevel * 100) + "%";

  return Math.round(zoomLevel * 100);
}

function fitToWidth() {
  const wrapper = document.querySelector("#vs-diagram .vs-zoom-wrapper");
  const container = document.getElementById("vs-diagram");
  if (!wrapper || !container) return;

  wrapper.style.transform = "scale(1)";
  const svgWidth = wrapper.scrollWidth;
  const containerWidth = container.clientWidth - 16;
  if (svgWidth <= 0) return;

  zoomLevel = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, containerWidth / svgWidth));
  zoomLevel = Math.round(zoomLevel * 100) / 100;
  wrapper.style.transform = `scale(${zoomLevel})`;

  const label = document.getElementById("vs-zoom-label");
  if (label) label.textContent = Math.round(zoomLevel * 100) + "%";
  log.debug("fitToWidth", { zoomLevel: zoomLevel.toFixed(2) });
}

let debugAutoRefreshTimer = null;

function toggleDebugPanel() {
  const panel = document.getElementById("vs-debug-panel");
  if (!panel) return;
  const visible = panel.style.display !== "none";
  panel.style.display = visible ? "none" : "flex";
  if (!visible) {
    refreshDebugLogs();
    startDebugAutoRefresh();
  } else {
    stopDebugAutoRefresh();
  }
}

function openDebugPanelIfClosed() {
  const panel = document.getElementById("vs-debug-panel");
  if (!panel || panel.style.display !== "none") return;
  panel.style.display = "flex";
  refreshDebugLogs();
  startDebugAutoRefresh();
}

function startDebugAutoRefresh() {
  stopDebugAutoRefresh();
  debugAutoRefreshTimer = setInterval(refreshDebugLogs, 1500);
}

function stopDebugAutoRefresh() {
  if (debugAutoRefreshTimer) {
    clearInterval(debugAutoRefreshTimer);
    debugAutoRefreshTimer = null;
  }
}

async function refreshDebugLogs() {
  const body = document.getElementById("vs-debug-body");
  if (!body) return;
  try {
    const result = await chrome.storage.local.get("vs_debug_logs");
    const logs = result.vs_debug_logs || [];
    const recent = logs.slice(-100);
    const wasAtBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 40;
    body.innerHTML = recent.map((entry) => {
      const color = { error: "#f87171", warn: "#fbbf24", success: "#4ade80", info: "#60a5fa", debug: "#8b8b8b" }[entry.level] || "#d4d4d8";
      const levelTag = entry.level === "error" ? " \u274C" : entry.level === "warn" ? " \u26A0" : entry.level === "success" ? " \u2705" : "";
      return `<div class="vs-debug-line" style="color:${color}"><span class="vs-debug-ts">${entry.ts}</span> <span class="vs-debug-cmp">[${entry.component}]</span> [${entry.level.toUpperCase()}]${levelTag} ${escapeHtml(entry.message)}</div>`;
    }).join("");
    if (wasAtBottom) body.scrollTop = body.scrollHeight;
  } catch (err) {
    body.innerHTML = `<div class="vs-debug-line" style="color:#f87171">Failed to load logs: ${escapeHtml(err.message)}</div>`;
  }
}

async function copyDebugLogs() {
  try {
    const result = await chrome.storage.local.get("vs_debug_logs");
    const logs = result.vs_debug_logs || [];
    const text = logs.map((e) => `${e.ts} [${e.component}] [${e.level}] ${e.message}`).join("\n");
    await navigator.clipboard.writeText(text);
    log.info("Debug logs copied to clipboard");
  } catch (err) {
    log.error("Failed to copy logs", { error: err.message });
  }
}

async function clearDebugLogs() {
  await chrome.storage.local.remove("vs_debug_logs");
  const body = document.getElementById("vs-debug-body");
  if (body) body.innerHTML = "<div class='vs-debug-line' style='color:#4ade80'>Logs cleared</div>";
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function toggleMinimize() {
  const panel = overlayEl.querySelector(".vs-panel");
  const isMinimized = panel.classList.contains("minimized");

  if (isMinimized) {
    panel.classList.remove("minimized");
    log.debug("Panel expanded");
  } else {
    panel.classList.add("minimized");
    log.debug("Panel minimized");
  }
}

function closeOverlay() {
  log.info("Closing overlay");
  voiceAgent?.endSession().catch((err) => {
    log.warn("closeOverlay: failed to end voice session", { error: err.message });
  });
  overlayEl?.remove();
  overlayEl = null;
  tooltipEl = null;
  zoomLevel = 1.35;
}

function setMicButtonState(active) {
  const micBtn = document.getElementById("vs-mic-btn");
  const vizzyDockBtn = document.getElementById("vs-vizzy-dock");

  if (micBtn) {
    micBtn.classList.toggle("active", !!active);
    micBtn.setAttribute("aria-pressed", active ? "true" : "false");
    micBtn.title = active ? "Voice assistant on (click to stop)" : "Voice assistant";
  }

  if (vizzyDockBtn) {
    vizzyDockBtn.classList.toggle("active", !!active);
    vizzyDockBtn.setAttribute("aria-pressed", active ? "true" : "false");
    vizzyDockBtn.title = active ? "Vizzy is listening (click to stop)" : "Vizzy voice assistant";
  }
}

function setupVoiceAgent() {
  if (voiceAgent) return;
  voiceAgent = new VoiceAgent({
    diagramManager: dm,
    renderDiagram,
    expandNodeById,
    applyZoom,
    getCurrentUrl: () => currentUrl,
    getPageContent: getCachedPageContent,
    onStateChange: ({ active }) => setMicButtonState(active),
  });
}

async function toggleVoiceAssistant() {
  try {
    setupVoiceAgent();
    if (voiceAgent.isActive()) {
      await voiceAgent.endSession();
      setMicButtonState(false);
      return;
    }

    const { elevenLabsAgentId } = await chrome.storage.local.get(["elevenLabsAgentId"]);
    if (!elevenLabsAgentId) {
      showError("ElevenLabs Agent ID is missing. Set it in extension settings.");
      return;
    }

    await voiceAgent.startSession(elevenLabsAgentId.trim());
    setMicButtonState(true);
  } catch (err) {
    log.error("toggleVoiceAssistant: FAILED", { error: err.message });
    showError(`Voice assistant error: ${err.message}`);
  }
}

function setupDrag() {
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  overlayEl.addEventListener("mousedown", (e) => {
    if (e.target.closest(".vs-float-btn") || e.target.closest(".node") || e.target.closest(".vs-minimized-pill")) return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = overlayEl.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    overlayEl.style.left = (startLeft + dx) + "px";
    overlayEl.style.top = (startTop + dy) + "px";
    overlayEl.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
}

function showLoading(message = "Generating summary...") {
  log.info("Showing loading state", { message });
  const container = document.getElementById("vs-diagram");
  container.innerHTML = `
    <div class="vs-loading">
      <div class="vs-spinner"></div>
      <span>${message}</span>
    </div>
  `;
}

function showError(message) {
  log.error("Showing error in overlay", { message });
  const container = document.getElementById("vs-diagram");
  container.innerHTML = `<div class="vs-error">${message}</div>`;
}

async function renderDiagram() {
  const container = document.getElementById("vs-diagram");
  const code = dm.toMermaid();

  // #region agent log
  fetch('http://127.0.0.1:7814/ingest/89e7e77c-a4b9-49d7-8f3c-f1031aca2b0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a46d54'},body:JSON.stringify({sessionId:'a46d54',location:'content-script.js:renderDiagram',message:'mermaid code generated',data:{codeLength:code?.length,codeFirst500:code?.slice(0,500),codeLast200:code?.slice(-200)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  if (!code) {
    log.warn("renderDiagram: No mermaid code generated");
    showError("No diagram data available");
    return;
  }

  log.info("renderDiagram: Rendering mermaid diagram", {
    codeLength: code.length,
    diagramType: dm.getDiagramType(),
    mermaidCode: code,
  });

  try {
    const id = "vs-mermaid-" + Date.now();
    // #region agent log
    fetch('http://127.0.0.1:7814/ingest/89e7e77c-a4b9-49d7-8f3c-f1031aca2b0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a46d54'},body:JSON.stringify({sessionId:'a46d54',location:'content-script.js:beforeMermaidRender',message:'about to call mermaid.render',data:{id,codeLength:code.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const { svg } = await mermaid.render(id, code);

    // #region agent log
    fetch('http://127.0.0.1:7814/ingest/89e7e77c-a4b9-49d7-8f3c-f1031aca2b0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a46d54'},body:JSON.stringify({sessionId:'a46d54',location:'content-script.js:afterMermaidRender',message:'mermaid.render succeeded',data:{svgLength:svg?.length},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    container.innerHTML = "";
    const wrapper = document.createElement("div");
    wrapper.className = "vs-zoom-wrapper";
    wrapper.innerHTML = svg;
    wrapper.style.transform = `scale(${zoomLevel})`;
    container.appendChild(wrapper);

    log.success("renderDiagram: Diagram rendered successfully");
    try {
      attachNodeListeners();
    } catch (listenerErr) {
      // #region agent log
      fetch('http://127.0.0.1:7814/ingest/89e7e77c-a4b9-49d7-8f3c-f1031aca2b0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a46d54'},body:JSON.stringify({sessionId:'a46d54',location:'content-script.js:attachNodeListenersFailed',message:'attachNodeListeners threw',data:{error:listenerErr.message,stack:listenerErr.stack},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
      log.error("attachNodeListeners FAILED", { error: listenerErr.message });
    }
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7814/ingest/89e7e77c-a4b9-49d7-8f3c-f1031aca2b0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a46d54'},body:JSON.stringify({sessionId:'a46d54',location:'content-script.js:mermaidRenderFailed',message:'mermaid.render THREW',data:{error:err.message,stack:err.stack?.slice(0,500)},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    log.error("renderDiagram: Mermaid render FAILED", {
      error: err.message,
      mermaidCode: code,
    });
    showError(`Diagram render failed: ${err.message}`);
    openDebugPanelIfClosed();
  }
}

function attachNodeListeners() {
  const container = document.getElementById("vs-diagram");
  const nodes = container.querySelectorAll(".node");

  log.debug("attachNodeListeners: Found SVG nodes", { count: nodes.length });

  let matched = 0;
  nodes.forEach((nodeEl) => {
    const rawId = nodeEl.id || "";
    const nodeId = rawId.replace(/^flowchart-/, "").replace(/-\d+$/, "");
    if (!nodeId || nodeId === "root_title") return;

    const treeNode = dm.findNode(nodeId);
    if (!treeNode) return;

    matched++;
    nodeEl.style.cursor = treeNode.expandable ? "pointer" : "default";

    nodeEl.addEventListener("click", (e) => {
      e.stopPropagation();
      handleNodeClick(nodeId);
    });

    nodeEl.addEventListener("mouseenter", (e) => {
      if (!treeNode.summary) return;
      showTooltip(treeNode.summary, e.clientX, e.clientY);
    });

    nodeEl.addEventListener("mouseleave", () => hideTooltip());
  });

  log.debug("attachNodeListeners: Matched", { matched, total: nodes.length });
}

function showTooltip(text, x, y) {
  if (!tooltipEl) return;
  tooltipEl.textContent = text;
  tooltipEl.style.left = Math.min(x, window.innerWidth - 300) + "px";
  tooltipEl.style.top = (y + 20) + "px";
  tooltipEl.classList.add("visible");
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove("visible");
}

async function handleNodeClick(nodeId) {
  log.info("handleNodeClick", { nodeId });

  const result = await expandNodeById(nodeId, { source: "click" });
  if (!result.ok) return;
}

async function expandNodeById(nodeId, options = {}) {
  const source = options.source || "unknown";
  const result = dm.toggleNode(nodeId);
  if (!result) {
    return { ok: false, message: "Node is not expandable." };
  }

  log.info("expandNodeById: Action", { action: result.action, nodeId, source });

  if (result.action === "collapse" || result.action === "expand") {
    await renderDiagram();
    return { ok: true, action: result.action, node: result.node };
  }

  if (result.action === "needs_expansion") {
    const node = result.node;
    showLoading(`Expanding "${node.label}"...`);

    log.info("expandNodeById: Requesting expansion", { nodeId: node.id, label: node.label, source });

    const response = await chrome.runtime.sendMessage({
      type: "EXPAND_NODE",
      nodeId: node.id,
      nodeSummary: node.summary,
      nodeLabel: node.label,
      nodeContent: node.contentChunk || "",
      sectionContent: node.sectionContent || "",
      url: currentUrl,
    });

    if (response.error) {
      log.error("expandNodeById: Expansion FAILED", { error: response.error, source });
      showError(response.error);
      return { ok: false, message: response.error };
    }

    log.success("expandNodeById: Expansion received", { childCount: response.children?.length, source });

    dm.mergeChildren(node.id, response.children, response.edges || []);
    await renderDiagram();

    chrome.runtime.sendMessage({
      type: "SAVE_TREE",
      url: currentUrl,
      tree: dm.getTree(),
    });
    return { ok: true, action: "needs_expansion", node };
  }

  return { ok: false, message: "No action taken." };
}

initMermaid();

document.addEventListener("visibilitychange", () => {
  if (document.hidden && voiceAgent?.isActive()) {
    voiceAgent.endSession().catch(() => {});
    setMicButtonState(false);
    log.info("Voice assistant stopped: tab hidden");
  }
});

window.addEventListener("beforeunload", () => {
  if (voiceAgent?.isActive()) {
    voiceAgent.endSession().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log.info("MESSAGE RECEIVED", { type: message.type });

  if (message.type === "RENDER_DIAGRAM") {
    // #region agent log
    fetch('http://127.0.0.1:7814/ingest/89e7e77c-a4b9-49d7-8f3c-f1031aca2b0f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a46d54'},body:JSON.stringify({sessionId:'a46d54',location:'content-script.js:RENDER_DIAGRAM_received',message:'RENDER_DIAGRAM message arrived',data:{url:message.url,nodeCount:message.tree?.nodes?.length,title:message.tree?.title,diagramType:message.tree?.diagramType},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    try {
      currentUrl = message.url;
      log.info("RENDER_DIAGRAM: Received", {
        title: message.tree?.title,
        diagramType: message.tree?.diagramType,
        nodeCount: message.tree?.nodes?.length,
        hasTree: !!message.tree,
      });

      dm.setTree(message.tree);
      zoomLevel = 1.35;

      const label = document.getElementById("vs-zoom-label");
      if (label) label.textContent = "135%";

      createOverlay();
      showLoading();

      renderDiagram()
        .then(() => {
          log.success("RENDER_DIAGRAM: Complete");
          sendResponse({ success: true });
        })
        .catch((err) => {
          log.error("RENDER_DIAGRAM: renderDiagram FAILED", { error: err.message, stack: err.stack });
          showError(`Render failed: ${err.message}`);
          openDebugPanelIfClosed();
          sendResponse({ success: false, error: err.message });
        });
    } catch (err) {
      log.error("RENDER_DIAGRAM: Setup FAILED", { error: err.message, stack: err.stack });
      showError(`Setup failed: ${err.message}`);
      openDebugPanelIfClosed();
      sendResponse({ success: false, error: err.message });
    }

    return true;
  }
});

log.info("Content script LOADED", { url: window.location.href });
