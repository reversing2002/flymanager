import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    historyApiFallback: true,
    proxy: {
      "/api": {
        target: "https://stripe.linked.fr",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "stripe-vendor": ["@stripe/stripe-js"],
          "date-vendor": ["date-fns"],
          "pdf-vendor": ["pdfjs-dist"],
        },
      },
    },
    chunkSizeWarningLimit: 1000
  },
  publicDir: 'public',
});
