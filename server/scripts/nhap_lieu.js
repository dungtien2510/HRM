'use strict';
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');

/** Nạp file .env như API (biến môi trường của hệ điều hành được ưu tiên). */
function nap_tep_env() {
  const duong_dan = process.env.HRM_ENV_FILE || path.join(__dirname, '..', '.env');
  if (fs.existsSync(duong_dan)) process.loadEnvFile(duong_dan);
  else console.warn(`(Không thấy ${duong_dan} — dùng biến môi trường hiện có)`);
}

function hoi(cau_hoi, mac_dinh = '') {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((ok) => {
    rl.question(mac_dinh ? `${cau_hoi} [${mac_dinh}]: ` : `${cau_hoi}: `, (tra_loi) => {
      rl.close();
      ok(tra_loi.trim() || mac_dinh);
    });
  });
}

/** Nhập mật khẩu, không hiện ký tự gõ. Khi stdin không phải terminal thì đọc một dòng như bình thường. */
function hoi_an(cau_hoi) {
  process.stdout.write(`${cau_hoi}: `);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
  if (process.stdin.isTTY) rl._writeToOutput = () => {}; // nuốt phần hiển thị ký tự đang gõ
  return new Promise((ok) => {
    rl.question('', (tra_loi) => {
      rl.close();
      process.stdout.write('\n');
      ok(tra_loi);
    });
  });
}

module.exports = { nap_tep_env, hoi, hoi_an };
