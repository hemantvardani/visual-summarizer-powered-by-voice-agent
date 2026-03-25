import { createLogger } from "../utils/logger.js";

const log = createLogger("Popup");

const summarizeBtn = document.getElementById("summarize-btn");
const statusText = document.getElementById("status-text");
const settingsToggle = document.getElementById("settings-toggle");
const mainView = document.getElementById("main-view");
const settingsView = document.getElementById("settings-view");
const saveKeysBtn = document.getElementById("save-keys");
const backBtn = document.getElementById("back-btn");
const anthropicKeyInput = document.getElementById("anthropic-key");
const openaiKeyInput = document.getElementById("openai-key");
const firecrawlKeyInput = document.getElementById("firecrawl-key");
const elevenLabsAgentIdInput = document.getElementById("elevenlabs-agent-id");
const saveStatus = document.getElementById("save-status");

function showView(view) {
  mainView.classList.remove("active");
  settingsView.classList.remove("active");
  view.classList.add("active");
}

settingsToggle.addEventListener("click", () => {
  log.info("Opening settings view");
  showView(settingsView);
  chrome.storage.local.get(["anthropicKey", "openaiKey", "firecrawlKey", "elevenLabsAgentId"], (result) => {
    if (result.anthropicKey) anthropicKeyInput.value = result.anthropicKey;
    if (result.openaiKey) openaiKeyInput.value = result.openaiKey;
    if (result.firecrawlKey) firecrawlKeyInput.value = result.firecrawlKey;
    if (result.elevenLabsAgentId) elevenLabsAgentIdInput.value = result.elevenLabsAgentId;
    log.debug("Loaded existing keys", {
      hasAnthropic: !!result.anthropicKey,
      hasOpenAI: !!result.openaiKey,
      hasFirecrawl: !!result.firecrawlKey,
      hasElevenLabsAgentId: !!result.elevenLabsAgentId,
    });
  });
});

backBtn.addEventListener("click", () => showView(mainView));

saveKeysBtn.addEventListener("click", () => {
  const anthropicKey = anthropicKeyInput.value.trim();
  const openaiKey = openaiKeyInput.value.trim();
  const firecrawlKey = firecrawlKeyInput.value.trim();
  const elevenLabsAgentId = elevenLabsAgentIdInput.value.trim();

  if ((!anthropicKey && !openaiKey) || !firecrawlKey) {
    log.warn("Save keys: Firecrawl and one LLM key required");
    saveStatus.textContent = "Set Firecrawl + Anthropic or OpenAI key";
    saveStatus.className = "status-text error";
    return;
  }

  chrome.storage.local.set({ anthropicKey, openaiKey, firecrawlKey, elevenLabsAgentId }, () => {
    log.success("API keys saved");
    saveStatus.textContent = "Keys saved!";
    saveStatus.className = "status-text success";
    setTimeout(() => {
      saveStatus.textContent = "";
      saveStatus.className = "status-text";
    }, 2000);
  });
});

summarizeBtn.addEventListener("click", async () => {
  log.info("Summarize button clicked");
  summarizeBtn.disabled = true;
  statusText.textContent = "Checking API keys...";
  statusText.className = "status-text";

  const { anthropicKey, openaiKey, firecrawlKey } = await chrome.storage.local.get([
    "anthropicKey",
    "openaiKey",
    "firecrawlKey",
  ]);

  if ((!anthropicKey && !openaiKey) || !firecrawlKey) {
    log.warn("Missing API keys");
    statusText.textContent = "Please set Firecrawl + Anthropic or OpenAI key in Settings";
    statusText.className = "status-text error";
    summarizeBtn.disabled = false;
    return;
  }

  statusText.textContent = "Summarizing page...";

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    log.info("Sending SUMMARIZE_PAGE message", { url: tab.url, tabId: tab.id });

    const response = await chrome.runtime.sendMessage({
      type: "SUMMARIZE_PAGE",
      url: tab.url,
      tabId: tab.id,
    });

    log.info("Got response from service worker", {
      hasError: !!response.error,
      hasTree: !!response.tree,
      cached: response.cached,
    });

    if (response.error) {
      log.error("Summarize failed", { error: response.error });
      statusText.textContent = response.error;
      statusText.className = "status-text error";
    } else {
      log.success("Summarize complete, closing popup");
      statusText.textContent = "Diagram ready!";
      statusText.className = "status-text success";
      window.close();
    }
  } catch (err) {
    log.error("Summarize exception", { error: err.message, stack: err.stack });
    statusText.textContent = `Error: ${err.message}`;
    statusText.className = "status-text error";
  } finally {
    summarizeBtn.disabled = false;
  }
});

const dumpLogsBtn = document.getElementById("dump-logs-btn");
const logStatus = document.getElementById("log-status");

dumpLogsBtn.addEventListener("click", async () => {
  logStatus.textContent = "Fetching logs...";
  logStatus.className = "status-text";
  try {
    const result = await chrome.storage.local.get("vs_debug_logs");
    const logs = result.vs_debug_logs || [];
    if (!logs.length) {
      logStatus.textContent = "No logs found.";
      logStatus.className = "status-text error";
      return;
    }
    const text = logs.map((e) => `${e.ts} [${e.component}] [${e.level}] ${e.message}`).join("\n");
    await navigator.clipboard.writeText(text);
    logStatus.textContent = `${logs.length} log entries copied to clipboard!`;
    logStatus.className = "status-text success";
    setTimeout(() => {
      logStatus.textContent = "";
      logStatus.className = "status-text";
    }, 3000);
  } catch (err) {
    logStatus.textContent = `Error: ${err.message}`;
    logStatus.className = "status-text error";
  }
});

log.info("Popup LOADED");
