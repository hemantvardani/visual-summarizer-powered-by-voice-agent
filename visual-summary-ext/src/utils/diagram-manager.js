import { createLogger } from "./logger.js";

const log = createLogger("DiagramManager");

export class DiagramManager {
  constructor() {
    this.tree = null;
  }

  setTree(tree) {
    log.info("setTree", {
      title: tree?.title,
      diagramType: tree?.diagramType,
      nodeCount: tree?.nodes?.length,
      edgeCount: tree?.edges?.length,
    });
    if (!tree.diagramType) tree.diagramType = "flowchart LR";
    this.tree = tree;
  }

  getDiagramType() {
    return this.tree?.diagramType || "flowchart LR";
  }

  getTree() {
    return this.tree;
  }

  findNode(nodeId, nodes = this.tree?.nodes, _depth = 0) {
    if (!nodes || _depth > 20) return null;
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children?.length) {
        const found = this.findNode(nodeId, node.children, _depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  toggleNode(nodeId) {
    const node = this.findNode(nodeId);
    if (!node) {
      log.warn("toggleNode: Node not found", { nodeId });
      return false;
    }

    if (node.expanded && node.children.length > 0) {
      node.expanded = false;
      log.info("toggleNode: COLLAPSE", { nodeId, label: node.label });
      return { action: "collapse", node };
    }

    if (node.expandable && node.children.length === 0) {
      log.info("toggleNode: NEEDS_EXPANSION", { nodeId, label: node.label });
      return { action: "needs_expansion", node };
    }

    if (node.children.length > 0) {
      node.expanded = true;
      log.info("toggleNode: EXPAND (from cache)", { nodeId, label: node.label, childCount: node.children.length });
      return { action: "expand", node };
    }

    log.debug("toggleNode: No action (leaf node)", { nodeId, label: node.label });
    return false;
  }

  mergeChildren(parentId, children, edges = []) {
    const parent = this.findNode(parentId);
    if (!parent) {
      log.error("mergeChildren: Parent not found", { parentId });
      return;
    }

    const childrenWithIds = children.map((child, i) => {
      const hasDepth =
        (child.contentChunk && child.contentChunk.length > 50) ||
        (child.summary && child.summary.length > 40);
      return {
        ...child,
        id: `${parentId}_${i + 1}`,
        expandable: child.expandable || hasDepth,
        expanded: false,
        children: child.children || [],
      };
    });

    const resolvedEdges = edges.map((edge) => {
      const resolveId = (placeholder) => {
        const match = placeholder.match(/PARENT_ID_(\d+)/);
        if (match) return `${parentId}_${match[1]}`;
        return placeholder;
      };
      return {
        from: resolveId(edge.from),
        to: resolveId(edge.to),
        label: edge.label,
      };
    });

    parent.children = childrenWithIds;
    parent.expanded = true;

    if (!this.tree.edges) this.tree.edges = [];
    this.tree.edges.push(...resolvedEdges);

    log.success("mergeChildren", {
      parentId,
      parentLabel: parent.label,
      childIds: childrenWithIds.map((c) => c.id),
      childLabels: childrenWithIds.map((c) => c.label),
      newEdges: resolvedEdges.length,
    });
  }

  toMermaid() {
    if (!this.tree) {
      log.warn("toMermaid: No tree set");
      return "";
    }

    let type = this.tree.diagramType || "flowchart LR";
    if (type === "mindmap") type = "flowchart LR";
    log.debug("toMermaid: Using diagram type", { type });

    const mermaidCode = this._toFlowchart(type);

    log.debug("toMermaid: Generated", {
      type,
      codeLength: mermaidCode.length,
    });

    return mermaidCode;
  }

  _toMindmap() {
    const lines = ["mindmap"];
    const title = this._escapeMindmapText(this.tree.title || "Summary");
    lines.push(`  root((${title}))`);

    this._mindmapNodeMap = {};

    const renderNodes = (nodes, depth = 2) => {
      const indent = "  ".repeat(depth);
      for (const node of nodes) {
        const label = this._escapeMindmapText(node.label);
        const expandIcon = node.expandable && !node.expanded ? " +" : "";
        const displayLabel = `${label}${expandIcon}`;

        this._mindmapNodeMap[displayLabel] = node.id;
        this._mindmapNodeMap[label] = node.id;

        if (node.expandable && !node.expanded) {
          lines.push(`${indent}[${displayLabel}]`);
        } else if (node.expanded) {
          lines.push(`${indent}(${displayLabel})`);
        } else {
          lines.push(`${indent}${displayLabel}`);
        }

        if (node.expanded && node.children.length > 0) {
          renderNodes(node.children, depth + 1);
        }
      }
    };

    renderNodes(this.tree.nodes);

    const code = lines.join("\n");
    log.debug("_toMindmap: Generated code", { code });
    return code;
  }

  getMindmapNodeMap() {
    return this._mindmapNodeMap || {};
  }

  _escapeMindmapText(text) {
    return text
      .replace(/[[\](){}"`]/g, "")
      .replace(/\n/g, " ")
      .trim();
  }

  _toFlowchart(type) {
    const lines = [type];
    const allEdges = [...(this.tree.edges || [])];

    if (this.tree.title && this.tree.nodes?.length > 1) {
      const titleLabel = this._escapeLabel(this.tree.title);
      lines.push(`    root_title(["${titleLabel}"]):::root`);
      for (const node of this.tree.nodes) {
        lines.push(`    root_title --> ${node.id}`);
      }
    }

    const renderNodes = (nodes) => {
      for (const node of nodes) {
        const label = this._escapeLabel(node.label);
        const expandIcon = node.expandable && !node.expanded ? " \u2295" : "";

        if (node.expandable && !node.expanded) {
          lines.push(`    ${node.id}["${label}${expandIcon}"]:::expandable`);
        } else if (node.expanded) {
          lines.push(`    ${node.id}["${label}"]:::expanded`);
        } else {
          lines.push(`    ${node.id}["${label}"]:::leaf`);
        }

        if (node.expanded && node.children.length > 0) {
          renderNodes(node.children);
          for (const child of node.children) {
            lines.push(`    ${node.id} --> ${child.id}`);
          }
        }
      }
    };

    renderNodes(this.tree.nodes);

    for (const edge of allEdges) {
      const fromExists = this.findNode(edge.from);
      const toExists = this.findNode(edge.to);
      if (!fromExists || !toExists) continue;

      const isVisible =
        this._isNodeVisible(edge.from) && this._isNodeVisible(edge.to);
      if (!isVisible) continue;

      if (edge.label) {
        lines.push(
          `    ${edge.from} -->|"${this._escapeLabel(edge.label)}"| ${edge.to}`
        );
      } else {
        lines.push(`    ${edge.from} --> ${edge.to}`);
      }
    }

    lines.push("");
    lines.push("    classDef root fill:#312e81,stroke:#8b5cf6,color:#e0d4ff,stroke-width:2px,font-weight:bold");
    lines.push("    classDef expandable fill:#1e1b4b,stroke:#7c3aed,color:#c4b5fd,stroke-width:2px");
    lines.push("    classDef expanded fill:#172554,stroke:#3b82f6,color:#93c5fd,stroke-width:2px");
    lines.push("    classDef leaf fill:#1c1917,stroke:#57534e,color:#d6d3d1,stroke-width:1px");

    return lines.join("\n");
  }

  _isNodeVisible(nodeId) {
    return this._findVisiblePath(nodeId, this.tree.nodes);
  }

  _findVisiblePath(nodeId, nodes, _depth = 0) {
    if (!nodes || _depth > 20) return false;
    for (const node of nodes) {
      if (node.id === nodeId) return true;
      if (node.expanded && node.children?.length > 0) {
        if (this._findVisiblePath(nodeId, node.children, _depth + 1)) return true;
      }
    }
    return false;
  }

  _escapeLabel(text) {
    return text
      .replace(/"/g, "'")
      .replace(/[[\]]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/#/g, "&num;");
  }
}
