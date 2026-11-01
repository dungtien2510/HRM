'use strict';
/**
 * Dựng từng màn hình React (JSX) ra HTML để bắt lỗi cú pháp/dựng cơ bản.
 * Dùng Vite ở chế độ middleware + ssrLoadModule để biên dịch JSX giống hệt khi build thật.
 * Cần đã chạy `npm install` (vite, react, react-dom); thiếu thì bỏ qua.
 */
const test = require('node:test');
const path = require('node:path');

async function tao_bo_nap() {
  const { createServer } = await import('vite');
  const may = await createServer({
    configFile: false,
    root: path.join(__dirname, '..', 'src', 'renderer'),
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false },
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  return { nap: (duong_dan) => may.ssrLoadModule(`/${duong_dan}`), dong: () => may.close() };
}

let co_thu_vien = true;
try { require.resolve('vite'); require.resolve('react'); require.resolve('react-dom/server'); } catch { co_thu_vien = false; }

if (!co_thu_vien) {
  test('giao diện (smoke)', { skip: 'chưa cài vite/react/react-dom (npm install)' }, () => {});
} else {
  let bo_nap;
  test.before(async () => { bo_nap = await tao_bo_nap(); });
  test.after(async () => { if (bo_nap) await bo_nap.dong(); });
  require('./ho_tro/kiem_tra_giao_dien').chay((duong_dan) => bo_nap.nap(duong_dan));
}
