import { resolve } from "path";
import { defineConfig } from "vite";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  cpSync,
} from "fs";

function manifestPlugin() {
  return {
    name: "write-manifest",
    closeBundle() {
      const distDir = resolve(__dirname, "dist");

      const manifest = JSON.parse(
        readFileSync(resolve(__dirname, "manifest.json"), "utf-8")
      );

      manifest.background.service_worker = "service-worker.js";
      manifest.content_scripts[0].js = ["content-script.js"];
      manifest.content_scripts[0].css = ["overlay.css"];
      manifest.action.default_icon = {
        16: "icons/icon16.png",
        48: "icons/icon48.png",
        128: "icons/icon128.png",
      };
      manifest.icons = manifest.action.default_icon;
      manifest.action.default_popup = "popup.html";
      manifest.web_accessible_resources = [];

      writeFileSync(
        resolve(distDir, "manifest.json"),
        JSON.stringify(manifest, null, 2)
      );
    },
  };
}

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "chrome115",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        "service-worker": resolve(
          __dirname,
          "src/background/service-worker.js"
        ),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
  publicDir: "public",
  plugins: [manifestPlugin()],
});
