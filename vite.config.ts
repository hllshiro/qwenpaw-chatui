import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import vue from "@vitejs/plugin-vue";
import vueRouter from "vue-router/vite";
import vueLayouts from "vite-plugin-vue-layouts";
import vueDevtools from "vite-plugin-vue-devtools";
import ui from "@nuxt/ui/vite";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@server": fileURLToPath(new URL("./server", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    watch: {
      ignored: [
        "**/docs/**",
        "**/*.md",
        "**/.output/**",
        "**/.github/**",
        "**/*.log",
      ],
    },
  },
  optimizeDeps: {
    exclude: ["monaco-editor"],
  },
  plugins: [
    vueRouter({
      dts: "src/route-map.d.ts",
    }),
    vueLayouts(),
    vueDevtools(),
    vue(),
    ui({
      prose: true,
      ui: {
        colors: {
          primary: "blue",
          neutral: "zinc",
        },
      },
    }),
    nitro({
      serverDir: "./server",
      rollupConfig: {
        output: {
          chunkFileNames: (chunk) => {
            const name = chunk.name || "chunk";
            return `_chunks/${name.replace(/\[/g, "\\[").replace(/\]/g, "\\]")}.mjs`;
          },
        },
      },
    }),
  ],
});
