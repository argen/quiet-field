import { resolve } from "node:path";
import { defineConfig } from "vite";

// The extension's new-tab page is built as a normal multi-page Vite app.
// During `vite dev` it serves at the localhost root with full HMR (chrome.* is
// stubbed — see src/storage.ts). `vite build` emits a static bundle that the
// manifest points at via chrome_url_overrides.newtab.
export default defineConfig({
  root: "src",
  // Relative asset URLs so the built pages load correctly from the extension
  // root regardless of the generated extension id.
  base: "./",
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: resolve(__dirname, "src/newtab.html"),
        settings: resolve(__dirname, "src/settings.html"),
      },
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["../test/**/*.test.ts"],
  },
});
