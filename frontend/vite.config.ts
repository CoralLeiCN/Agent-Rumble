import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
    fs: {
      allow: [
        ".",
        "../plugins/agent-project-card/skills/agent-project-card/references/project-card.schema.json",
      ],
    },
  },
});
