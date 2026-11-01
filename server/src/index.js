'use strict';
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { doc_cau_hinh } = require('./cau_hinh');
const { tao_log } = require('./tien_ich/che_log');
const { ket_noi_mongo } = require('./csdl');
const { kiem_tra_phien_ban_schema } = require('./csdl/cau_truc');
const { tao_kho_mongo } = require('./kho/mongo');
const { tao_dich_vu_mat_khau } = require('./dich_vu/mat_khau');
const { tao_dich_vu_token } = require('./dich_vu/token');
const { tao_gioi_han } = require('./dich_vu/gioi_han_dang_nhap');
const { tao_dich_vu_nhat_ky } = require('./dich_vu/nhat_ky');
const { tao_kiem_tra_phien_ban } = require('./dich_vu/phien_ban');
const { tao_dich_vu_dang_nhap } = require('./dich_vu/dang_nhap');
const { tao_ung_dung } = require('./ung_dung');

function nap_tep_env() {
  const duong_dan = process.env.HRM_ENV_FILE || path.join(__dirname, '..', '.env');
  if (fs.existsSync(duong_dan)) process.loadEnvFile(duong_dan); // biến môi trường của hệ điều hành được ưu tiên hơn file
}

async function main() {
  const log = tao_log();
  nap_tep_env();
  const cau_hinh = doc_cau_hinh(process.env, { can_tls: true });

  const { client, db } = await ket_noi_mongo(cau_hinh.mongo);
  const kho = tao_kho_mongo(db);
  await kiem_tra_phien_ban_schema(db); // từ chối chạy nếu cấu trúc CSDL chưa đúng phiên bản (API không tự sửa cấu trúc)

  const mat_khau = tao_dich_vu_mat_khau({ cost: cau_hinh.bcrypt_cost });
  const token = tao_dich_vu_token({ ...cau_hinh.jwt });
  const gioi_han = tao_gioi_han({
    kho: kho.luot_dang_nhap,
    sai_toi_da_tai_khoan: cau_hinh.dang_nhap.sai_toi_da_tai_khoan,
    sai_toi_da_ip: cau_hinh.dang_nhap.sai_toi_da_ip,
    cua_so_ms: cau_hinh.dang_nhap.cua_so_ms,
  });
  const nhat_ky = tao_dich_vu_nhat_ky({ kho: kho.nhat_ky, log });
  const kiem_tra_phien_ban = tao_kiem_tra_phien_ban({
    kho_cau_hinh: kho.cau_hinh, mac_dinh: cau_hinh.phien_ban_toi_thieu_mac_dinh,
  });
  const dich_vu_dang_nhap = tao_dich_vu_dang_nhap({
    kho_nguoi_dung: kho.nguoi_dung, gioi_han, nhat_ky, mat_khau, token, bi_mat_tham_chieu: cau_hinh.jwt.bi_mat, log,
  });

  const app = tao_ung_dung({
    log,
    kho,
    token,
    kiem_tra_phien_ban,
    dich_vu_dang_nhap,
    kiem_tra_csdl: async () => { await db.command({ ping: 1 }); return true; },
  });

  // Chỉ HTTPS: không mở cổng HTTP nào.
  const may_chu = https.createServer({
    pfx: fs.readFileSync(cau_hinh.tls.pfx),
    passphrase: cau_hinh.tls.mat_khau,
    minVersion: 'TLSv1.2',
  }, app);
  may_chu.requestTimeout = 30_000;
  may_chu.headersTimeout = 15_000;
  may_chu.keepAliveTimeout = 5_000;

  await new Promise((ok, loi) => {
    may_chu.once('error', loi);
    may_chu.listen(cau_hinh.cong, cau_hinh.dia_chi_lang_nghe, ok);
  });
  log.thong_tin('API đã sẵn sàng (HTTPS)', { cong: cau_hinh.cong, moi_truong: cau_hinh.moi_truong });

  let dang_tat = false;
  async function tat(tin_hieu) {
    if (dang_tat) return;
    dang_tat = true;
    log.thong_tin('Đang tắt API', { tin_hieu });
    setTimeout(() => process.exit(1), 10_000).unref();
    await new Promise((ok) => may_chu.close(ok));
    await client.close();
    process.exit(0);
  }
  for (const t of ['SIGINT', 'SIGTERM', 'SIGBREAK']) process.on(t, () => { tat(t); });
}

main().catch((loi) => {
  // Lỗi khởi động (thường do cấu hình): in thông điệp đã che, thoát để dịch vụ báo lỗi/khởi động lại.
  const log = tao_log();
  log.loi('Không khởi động được API', { loi });
  process.exit(1);
});
