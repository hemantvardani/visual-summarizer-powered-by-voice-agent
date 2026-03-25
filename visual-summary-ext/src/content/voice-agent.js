import { Conversation } from "@elevenlabs/client";
import { createLogger } from "../utils/logger.js";

const log = createLogger("VoiceAgent");

export class VoiceAgent {
  constructor(options) {
    this.dm = options.diagramManager;
    this.renderDiagram = options.renderDiagram;
    this.expandNodeById = options.expandNodeById;
    this.applyZoom = options.applyZoom;
    this.getCurrentUrl = options.getCurrentUrl;
    this.getPageContent = options.getPageContent;
    this.onStateChange = options.onStateChange;
    this.session = null;
  }

  isActive() {
    return !!this.session;
  }

  async startSession(agentId) {
    if (!agentId) throw new Error("ElevenLabs Agent ID is missing. Add it in extension settings.");
    if (this.session) return;

    log.info("startSession: requesting microphone permission");
    await navigator.mediaDevices.getUserMedia({ audio: true });
    log.info("startSession: mic permission granted");

    log.info("startSession: opening ElevenLabs conversation", { agentId: agentId.slice(0, 12) + "..." });
    this.session = await Conversation.startSession({
      agentId,
      clientTools: {
        list_nodes: async () => {
          log.info("TOOL CALL: list_nodes");
          const result = await this.listNodesTool();
          log.info("TOOL RESULT: list_nodes", { result });
          return result;
        },
        expand_node: async ({ node_label }) => {
          log.info("TOOL CALL: expand_node", { node_label });
          const result = await this.expandNodeTool(node_label);
          log.info("TOOL RESULT: expand_node", { result });
          return result;
        },
        collapse_node: async ({ node_label }) => {
          log.info("TOOL CALL: collapse_node", { node_label });
          const result = await this.collapseNodeTool(node_label);
          log.info("TOOL RESULT: collapse_node", { result });
          return result;
        },
        get_node_details: async ({ node_label }) => {
          log.info("TOOL CALL: get_node_details", { node_label });
          const result = await this.getNodeDetailsTool(node_label);
          log.info("TOOL RESULT: get_node_details", { result: result.slice(0, 200) });
          return result;
        },
        search_page_content: async ({ query }) => {
          log.info("TOOL CALL: search_page_content", { query });
          const result = await this.searchPageContentTool(query);
          log.info("TOOL RESULT: search_page_content", { result: result.slice(0, 200) });
          return result;
        },
        zoom_in: async () => {
          log.info("TOOL CALL: zoom_in");
          const result = await this.zoomTool(1);
          log.info("TOOL RESULT: zoom_in", { result });
          return result;
        },
        zoom_out: async () => {
          log.info("TOOL CALL: zoom_out");
          const result = await this.zoomTool(-1);
          log.info("TOOL RESULT: zoom_out", { result });
          return result;
        },
      },
      onStatusChange: (status) => {
        log.info("onStatusChange", { status });
        if (status?.status === "disconnected" && this.session) {
          log.warn("Unexpected disconnect from ElevenLabs");
          this.session = null;
          this.onStateChange?.({ active: false, status: "disconnected" });
        }
      },
      onError: (err) => {
        log.error("onError", { error: err?.message || String(err), details: err });
      },
      onMessage: (message) => {
        log.debug("onMessage", { type: message?.type, source: message?.source });
      },
    });

    this.onStateChange?.({ active: true, status: "connected" });
    log.success("startSession: connected");
  }

  async endSession() {
    if (!this.session) return;
    const activeSession = this.session;
    this.session = null;
    try {
      if (typeof activeSession.endSession === "function") {
        await activeSession.endSession();
      } else if (typeof activeSession.end === "function") {
        await activeSession.end();
      }
    } catch (err) {
      log.warn("endSession: failed to close cleanly", { error: err?.message || String(err) });
    }
    this.onStateChange?.({ active: false, status: "disconnected" });
    log.info("endSession: complete");
  }

  async listNodesTool() {
    const visibleNodes = this._getVisibleNodes();
    if (!visibleNodes.length) return "No visible nodes right now.";
    const labels = visibleNodes.map((node) => node.label).join(", ");
    return `Visible sections: ${labels}`;
  }

  async expandNodeTool(nodeLabel) {
    const node = this._matchNode(nodeLabel);
    if (!node) return `Could not find a section matching "${nodeLabel}".`;

    const result = await this.expandNodeById(node.id, { source: "voice" });
    if (!result?.ok) {
      return result?.message || `Failed to expand "${node.label}".`;
    }

    const refreshed = this.dm.findNode(node.id);
    const childLabels = (refreshed?.children || []).map((child) => child.label);
    if (!childLabels.length) {
      return `${node.label} is open. ${refreshed?.summary || ""}`.trim();
    }
    return `${node.label} expanded. ${refreshed?.summary || ""} Sub-sections: ${childLabels.join(", ")}.`;
  }

  async collapseNodeTool(nodeLabel) {
    const node = this._matchNode(nodeLabel);
    if (!node) return `Could not find a section matching "${nodeLabel}".`;

    const result = await this.dm.toggleNode(node.id);
    if (!result) return `"${node.label}" cannot be collapsed.`;
    if (result.action === "collapse") {
      await this.renderDiagram();
      return `${node.label} collapsed.`;
    }
    return `"${node.label}" is not currently expanded.`;
  }

  async getNodeDetailsTool(nodeLabel) {
    const node = this._matchNode(nodeLabel);
    if (!node) return `Could not find a section matching "${nodeLabel}".`;
    const summary = node.summary || "No summary available.";
    const chunk = node.contentChunk || "No detailed content found.";
    return `Summary: ${summary}\nDetails: ${chunk}`;
  }

  async searchPageContentTool(query) {
    if (!query) return "No search query provided.";
    const content = await this.getPageContent();
    if (!content) return "No page content is cached yet. Summarize this page first.";

    const chunks = content
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
    const normalizedQuery = query.toLowerCase();
    const matches = chunks.filter((chunk) => chunk.toLowerCase().includes(normalizedQuery)).slice(0, 3);

    if (!matches.length) return `No direct match found for "${query}" in page content.`;
    return matches.join("\n---\n");
  }

  async zoomTool(direction) {
    const percent = this.applyZoom(direction);
    return `Zoom is now ${percent}%.`;
  }

  async _buildContextText() {
    const url = this.getCurrentUrl?.() || "unknown";
    const visibleLabels = this._getVisibleNodes().map((node) => node.label).join(", ") || "none";
    return [
      "You are the voice assistant for Visual Summary, a browser extension that renders webpage content as an interactive flowchart.",
      "Speak naturally and keep answers concise (1-3 sentences).",
      "Use tools when needed to expand, collapse, zoom, inspect node details, or search page content.",
      `Current URL: ${url}`,
      `Visible sections: ${visibleLabels}`,
    ].join("\n");
  }

  _getVisibleNodes() {
    const tree = this.dm.getTree();
    if (!tree?.nodes) return [];
    const visible = [];

    const walk = (nodes) => {
      for (const node of nodes) {
        visible.push(node);
        if (node.expanded && node.children?.length) {
          walk(node.children);
        }
      }
    };

    walk(tree.nodes);
    return visible;
  }

  _getAllNodes() {
    const tree = this.dm.getTree();
    if (!tree?.nodes) return [];
    const all = [];
    const walk = (nodes) => {
      for (const node of nodes) {
        all.push(node);
        if (node.children?.length) walk(node.children);
      }
    };
    walk(tree.nodes);
    return all;
  }

  _matchNode(spokenLabel = "") {
    const query = spokenLabel.trim().toLowerCase();
    if (!query) return null;
    const allNodes = this._getAllNodes();
    if (!allNodes.length) return null;

    const contains = allNodes
      .filter((node) => node.label?.toLowerCase().includes(query))
      .sort((a, b) => a.label.length - b.label.length);
    if (contains.length) return contains[0];

    const queryWords = query.split(/\s+/).filter(Boolean);
    let best = null;
    let bestScore = 0;
    for (const node of allNodes) {
      const label = (node.label || "").toLowerCase();
      const score = queryWords.reduce((sum, word) => sum + (label.includes(word) ? 1 : 0), 0);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }
    return bestScore > 0 ? best : null;
  }
}
