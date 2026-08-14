import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(process.cwd(), 'index.html'),
        cardapio: path.resolve(process.cwd(), 'cardapio.html'),
        pedido: path.resolve(process.cwd(), 'pedido.html')
      }
    }
  }
});
