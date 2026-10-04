import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@meb-gallery/shared": path.resolve(import.meta.dirname, "../../packages/shared/src/index.ts"),
    },
    extensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
