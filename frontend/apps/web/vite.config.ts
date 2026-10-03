import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const repoRoot = fileURLToPath(
  new URL("../..", import.meta.url),
);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "./",

  resolve: {
    alias: {
      "@": fileURLToPath(
        new URL("./src", import.meta.url),
      ),
      "@aapg/shared": fileURLToPath(
        new URL(
          "../../packages/shared/src/index.ts",
          import.meta.url,
        ),
      ),
      "@aapg/correlation": fileURLToPath(
        new URL(
          "../../packages/correlation/src/index.ts",
          import.meta.url,
        ),
      ),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,

    allowedHosts: [
      ...(process.env.FRONTEND_ALLOWED_HOST ? [process.env.FRONTEND_ALLOWED_HOST] : []),
    ],

    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },

    fs: {
      allow: [repoRoot],
    },
  },

  preview: {
  host: "0.0.0.0",
  port: 4173,
  strictPort: true,

  allowedHosts: [
    ...(process.env.FRONTEND_ALLOWED_HOST ? [process.env.FRONTEND_ALLOWED_HOST] : []),
  ],

  proxy: {
    "/api": {
      target: "http://127.0.0.1:3001",
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ""),
    },
  },
},
});
