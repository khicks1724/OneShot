import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], build: { assetsInlineLimit: 1000000, cssCodeSplit: false, rollupOptions: { output: { entryFileNames: 'app.js', assetFileNames: 'app.[ext]' } } } });
