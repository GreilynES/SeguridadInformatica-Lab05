import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
const backend = process.env.UNA_CHAT_BACKEND_URL || 'http://127.0.0.1:3000';
export default defineConfig({
 root: fileURLToPath(new URL('.', import.meta.url)),
 plugins: [react()],
 publicDir: fileURLToPath(new URL('../public', import.meta.url)),
 server: {
  host: 'localhost', port: 5173, strictPort: true,
  proxy: {'/socket.io': {target: backend, ws: true}},
 },
 preview: {host: 'localhost', port: 5173, strictPort: true},
 build: {outDir: 'dist', emptyOutDir: true},
});
