'use strict';
/**
 * Đặt phiên bản ứng dụng tối thiểu (collection cau_hinh, _id "he_thong").
 * Ứng dụng có phiên bản thấp hơn sẽ nhận mã 426 và hiện màn hình "Cần cập nhật".
 *   npm run dat_phien_ban_toi_thieu --workspace server -- 0.2.0
 */
const os = require('node:os');
const { phan_tich_phien_ban, HANH_DONG_NHAT_KY, KET_QUA_NHAT_KY } = require('@hrm/shared');
const { nap_tep_env } = require('./nhap_lieu');
const { doc_cau_hinh } = require('../src/cau_hinh');
const { ket_noi_mongo } = require('../src/csdl');
const { tao_kho_mongo } = require('../src/kho/mongo');
const { tao_dich_vu_nhat_ky } = require('../src/dich_vu/nhat_ky');
const { tao_log } = require('../src/tien_ich/che_log');

async function main() {
  const phien_ban = (process.argv[2] || '').trim();
  if (!phan_tich_phien_ban(phien_ban)) throw new Error('Cách dùng: npm run dat_phien_ban_toi_thieu --workspace server -- <x.y.z>');
  nap_tep_env();
  const cau_hinh = doc_cau_hinh(process.env, { can_tls: false });
  const { client, db } = await ket_noi_mongo(cau_hinh.mongo);
  try {
    const kho = tao_kho_mongo(db);
    const cu = await kho.cau_hinh.lay('he_thong');
    if (!cu) throw new Error('Chưa có cấu hình hệ thống — hãy chạy "npm run khoi_tao_csdl" trước.');
    await db.collection('cau_hinh').updateOne({ _id: 'he_thong' }, { $set: { phien_ban_toi_thieu: phien_ban, updated_at: new Date() } });
    await tao_dich_vu_nhat_ky({ kho: kho.nhat_ky, log: tao_log() }).ghi({
      hanh_dong: HANH_DONG_NHAT_KY.SUA_DU_LIEU,
      ket_qua: KET_QUA_NHAT_KY.THANH_CONG,
      tai_khoan: { id: null, ten: 'he_thong_cli' },
      may: { ten: os.hostname(), ip: '127.0.0.1' },
      chi_tiet: { muc: 'cau_hinh', truong: 'phien_ban_toi_thieu', tu: cu ? cu.phien_ban_toi_thieu : null, den: phien_ban },
    });
    console.log(`Phiên bản tối thiểu: ${cu ? cu.phien_ban_toi_thieu : '(chưa có)'} → ${phien_ban} (có hiệu lực trong tối đa 30 giây).`);
  } finally {
    await client.close();
  }
}

main().catch((loi) => { console.error(`LỖI: ${loi.message}`); process.exit(1); });
