import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths work both at a user site and under /repository-name/.
  base: "./",
  plugins: [react()],
});
