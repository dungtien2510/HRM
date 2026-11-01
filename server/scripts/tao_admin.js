'use strict';
/** Tạo tài khoản admin của ứng dụng (chỉ được có một). Chạy trên máy chủ: npm run tao_admin */
const os = require('node:os');
const { z } = require('zod');
const { LOAI_TAI_KHOAN, HANH_DONG_NHAT_KY, KET_QUA_NHAT_KY } = require('@hrm/shared');
const { nap_tep_env, hoi, hoi_an } = require('./nhap_lieu');
const { doc_cau_hinh } = require('../src/cau_hinh');
const { ket_noi_mongo } = require('../src/csdl');
const { kiem_tra_phien_ban_schema } = require('../src/csdl/cau_truc');
const { tao_kho_mongo } = require('../src/kho/mongo');
const { tao_dich_vu_mat_khau, kiem_tra_do_manh } = require('../src/dich_vu/mat_khau');
const { tao_dich_vu_nhat_ky } = require('../src/dich_vu/nhat_ky');
const { tao_log } = require('../src/tien_ich/che_log');

const luoc_do_ten = z.string().regex(/^[a-z0-9._-]{3,32}$/, 'Tên đăng nhập gồm 3–32 ký tự: chữ thường, số, dấu . _ -');

async function main() {
  nap_tep_env();
  const cau_hinh = doc_cau_hinh(process.env, { can_tls: false });
  const { client, db } = await ket_noi_mongo(cau_hinh.mongo);
  try {
    const kho = tao_kho_mongo(db);
    await kiem_tra_phien_ban_schema(db); // cần đã chạy: npm run khoi_tao_csdl
    if ((await kho.nguoi_dung.dem_theo_loai(LOAI_TAI_KHOAN.ADMIN)) > 0) {
      throw new Error('Đã có tài khoản admin. Hệ thống chỉ cho phép một admin.');
    }

    const ten = luoc_do_ten.parse((await hoi('Tên đăng nhập admin', 'admin')).toLowerCase());
    const ten_hien_thi = (await hoi('Tên hiển thị', 'Quản trị hệ thống')).slice(0, 80);
    const mk = await hoi_an('Mật khẩu admin (từ 12 ký tự)');
    const mk2 = await hoi_an('Nhập lại mật khẩu');
    if (mk !== mk2) throw new Error('Hai lần nhập mật khẩu không khớp.');
    const loi_mk = kiem_tra_do_manh(mk, ten);
    if (loi_mk.length) throw new Error(loi_mk.join(' '));

    const dich_vu_mk = tao_dich_vu_mat_khau({ cost: cau_hinh.bcrypt_cost });
    const bay_gio = new Date();
    const tk = await kho.nguoi_dung.tao({
      ten_dang_nhap: ten,
      ten_hien_thi,
      mat_khau_bam: await dich_vu_mk.bam(mk),
      loai: LOAI_TAI_KHOAN.ADMIN,
      muc_duoc_xem: [],
      khoa: false,
      buoc_doi_mat_khau: false, // admin tự đặt mật khẩu ngay tại đây nên không bắt đổi
      so_lan_sai: 0,
      so_phien_token: 1,
      created_at: bay_gio,
      updated_at: bay_gio,
    });
    const nhat_ky = tao_dich_vu_nhat_ky({ kho: kho.nhat_ky, log: tao_log() });
    await nhat_ky.ghi({
      hanh_dong: HANH_DONG_NHAT_KY.TAO_TAI_KHOAN,
      ket_qua: KET_QUA_NHAT_KY.THANH_CONG,
      tai_khoan: { id: null, ten: 'he_thong_cli' },
      may: { ten: os.hostname(), ip: '127.0.0.1' },
      chi_tiet: { loai: LOAI_TAI_KHOAN.ADMIN, ten_dang_nhap: ten, id_moi: String(tk._id) },
    });
    console.log(`Đã tạo tài khoản admin "${ten}".`);
  } finally {
    await client.close();
  }
}

main().catch((loi) => {
  console.error(`LỖI: ${loi.message}`);
  process.exit(1);
});
