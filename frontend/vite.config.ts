import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        ".",
        "../plugins/agent-project-card/skills/agent-project-card/references/project-card.schema.json",
      ],
    },
  },
});
