// Giao diện (renderer) được đóng gói bằng Vite thành các file tĩnh trong dist/renderer,
// rồi Electron nạp bằng loadFile (không có máy chủ web, không có kết nối mạng).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thu_muc_app = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(thu_muc_app, 'src', 'renderer'),
  base: './', // đường dẫn tương đối để chạy được từ file://
  plugins: [react()],
  clearScreen: false,
  build: {
    outDir: path.join(thu_muc_app, 'dist', 'renderer'),
    emptyOutDir: true,
    assetsInlineLimit: 0, // không nhúng phông/ảnh dạng data: (CSP chỉ cho phép font-src 'self')
    modulePreload: { polyfill: false }, // không chèn script nội tuyến (CSP script-src 'self')
    sourcemap: false,
  },
});
