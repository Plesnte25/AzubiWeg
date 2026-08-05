import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // bind to all interfaces (not just localhost) so the dev server is
    // reachable from other devices on the LAN, e.g. testing on a phone
    host: true,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    sourcemap: true,
  },
});
