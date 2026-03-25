import { resolve } from "path";
import { defineConfig } from "vite";
import { readFileSync, writeFileSync } from "fs";

function escapeNonAscii() {
  return {
    name: "escape-non-ascii",
    closeBundle() {
      const filePath = resolve(__dirname, "dist", "content-script.js");
      let content = readFileSync(filePath, "utf-8");

      content = content.replace(/[^\x00-\x7F]/g, (char) => {
        const code = char.codePointAt(0);
        if (code > 0xffff) {
          const hi = Math.floor((code - 0x10000) / 0x400) + 0xd800;
          const lo = ((code - 0x10000) % 0x400) + 0xdc00;
          return `\\u${hi.toString(16).padStart(4, "0")}\\u${lo.toString(16).padStart(4, "0")}`;
        }
        return `\\u${code.toString(16).padStart(4, "0")}`;
      });

      writeFileSync(filePath, content, "utf-8");
    },
  };
}

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "chrome115",
    lib: {
      entry: resolve(__dirname, "src/content/content-script.js"),
      name: "VisualSummaryContent",
      formats: ["iife"],
      fileName: () => "content-script.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  publicDir: false,
  plugins: [escapeNonAscii()],
});
