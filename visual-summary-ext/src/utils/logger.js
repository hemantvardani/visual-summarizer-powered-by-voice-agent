const LOG_KEY = "vs_debug_logs";
const MAX_PERSISTED_LOGS = 200;
const DEBUG = true;

const COLORS = {
  debug: "#8b8b8b",
  info: "#60a5fa",
  warn: "#fbbf24",
  error: "#f87171",
  success: "#4ade80",
};

function timestamp() {
  return new Date().toISOString().slice(11, 23);
}

function persist(entry) {
  try {
    chrome.storage.local.get(LOG_KEY, (result) => {
      const logs = result[LOG_KEY] || [];
      logs.push(entry);
      if (logs.length > MAX_PERSISTED_LOGS) {
        logs.splice(0, logs.length - MAX_PERSISTED_LOGS);
      }
      chrome.storage.local.set({ [LOG_KEY]: logs });
    });
  } catch {
    // storage unavailable in some contexts
  }
}

function createLogger(component) {
  const prefix = `[VisualSummary:${component}]`;

  function log(level, ...args) {
    if (!DEBUG && level === "debug") return;

    const ts = timestamp();
    const color = COLORS[level] || COLORS.info;
    const tag = `${ts} ${prefix}`;

    console.log(
      `%c${tag} %c[${level.toUpperCase()}]`,
      `color: ${COLORS.info}; font-weight: bold`,
      `color: ${color}; font-weight: bold`,
      ...args
    );

    const message = args
      .map((a) => {
        if (typeof a === "string") return a;
        try {
          return JSON.stringify(a, null, 2);
        } catch {
          return String(a);
        }
      })
      .join(" ");

    persist({ ts, component, level, message });
  }

  function consoleOnly(level, ...args) {
    if (!DEBUG && level === "debug") return;
    const ts = timestamp();
    const color = COLORS[level] || COLORS.info;
    const tag = `${ts} ${prefix}`;
    console.log(
      `%c${tag} %c[${level.toUpperCase()}]`,
      `color: ${COLORS.info}; font-weight: bold`,
      `color: ${color}; font-weight: bold`,
      ...args
    );
  }

  return {
    debug: (...args) => log("debug", ...args),
    info: (...args) => log("info", ...args),
    warn: (...args) => log("warn", ...args),
    error: (...args) => log("error", ...args),
    success: (...args) => log("success", ...args),

    /** Log to browser console only — skips chrome.storage persistence (use for large previews). */
    console: (...args) => consoleOnly("debug", ...args),

    /** Dump all persisted logs to console */
    async dumpLogs() {
      const result = await chrome.storage.local.get(LOG_KEY);
      const logs = result[LOG_KEY] || [];
      console.group(`${prefix} Persisted Logs (${logs.length})`);
      logs.forEach((entry) => {
        const color = COLORS[entry.level] || COLORS.info;
        console.log(
          `%c${entry.ts} [${entry.component}] [${entry.level.toUpperCase()}]`,
          `color: ${color}`,
          entry.message
        );
      });
      console.groupEnd();
      return logs;
    },

    /** Clear persisted logs */
    async clearLogs() {
      await chrome.storage.local.remove(LOG_KEY);
      console.log(`${prefix} Persisted logs cleared`);
    },
  };
}

export { createLogger };
