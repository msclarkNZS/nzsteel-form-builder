import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ─────────────────────────────────────────────────────────────
// IMPORTANT: set `base` to match your GitHub repo name.
// If your repo is github.com/msclarkNZS/nzsteel-form-builder,
// base should be "/nzsteel-form-builder/" (matching exactly,
// including case and slashes). This is what makes the built
// app load its files correctly when served from GitHub Pages.
// ─────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  base: "/nzsteel-form-builder/",
});
