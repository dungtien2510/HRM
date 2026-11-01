'use strict';
/** Phần dùng chung của `npm run khoi_tao_csdl` và `npm run nang_cap_csdl`. */
const { MongoClient } = require('mongodb');
const { nap_tep_env, hoi, hoi_an } = require('../nhap_lieu');
const { nang_cap_csdl } = require('../../src/csdl/nang_cap/chay');
const { cap_quyen_db_owner } = require('../../src/csdl/nang_cap/kiem_tra_truoc');
const { PHIEN_BAN_SCHEMA } = require('../../src/csdl/cau_truc');

const ghi = (muc, thong_diep) => {
  const nhan = { buoc: '>>', thong_tin: '  ', canh_bao: ' !' }[muc] || '  ';
  console.log(`${nhan} ${thong_diep}`);
};

function in_bao_cao(kq) {
  console.log(`\nPhiên bản cấu trúc: CSDL = ${kq.hien_tai}, mã nguồn = ${kq.dich}`);
  if (kq.ke_hoach.length === 0) console.log('Kế hoạch: đã đúng phiên bản — sẽ chỉ ép lại validator, chỉ mục, vai trò (an toàn).');
  for (const b of kq.ke_hoach) console.log(`Kế hoạch: → ${b.den}: ${b.ten}`);
  for (const t of kq.thong_tin) console.log(`  ℹ ${t}`);
  for (const c of kq.canh_bao) console.log(`  ! ${c}`);
  for (const l of kq.loi) console.log(`  ✗ ${l}`);
}

async function chay_cli({ tieu_de, argv }) {
  const chi_kiem_tra = argv.includes('--chi-kiem-tra');
  const dong_y_het = argv.includes('--yes');
  nap_tep_env();
  const may = process.env.MONGO_MAY || '127.0.0.1';
  const cong = Number(process.env.MONGO_CONG || 27017);
  const csdl = process.env.MONGO_CSDL || 'hrm_nhan_su';
  if (!['127.0.0.1', 'localhost', '::1'].includes(may)) throw new Error('MONGO_MAY phải là 127.0.0.1 hoặc localhost');
  if (!/^[A-Za-z0-9_]{1,64}$/.test(csdl)) throw new Error('MONGO_CSDL không hợp lệ');

  console.log(`${tieu_de}\nMongoDB ${may}:${cong} · CSDL "${csdl}" · cấu trúc đích: phiên bản ${PHIEN_BAN_SCHEMA}${chi_kiem_tra ? ' · CHỈ KIỂM TRA (không thay đổi gì)' : ''}`);
  console.log('Lời khuyên: sao lưu thư mục dữ liệu MongoDB trước khi nâng cấp (dữ liệu cũ không bị xóa, nhưng sao lưu vẫn là thói quen tốt).\n');
  const ten = process.env.MONGO_QUAN_TRI_NGUOI_DUNG || await hoi('Tên user quản trị MongoDB', 'hrm_quan_tri_mongo');
  const mat_khau = await hoi_an('Mật khẩu user quản trị MongoDB');

  const ket_noi = async () => {
    const client = new MongoClient(`mongodb://${may}:${cong}/`, {
      directConnection: true, serverSelectionTimeoutMS: 5000, appName: 'hrm-nang-cap', auth: { username: ten, password: mat_khau }, authSource: 'admin',
    });
    await client.connect();
    return client;
  };

  let client = await ket_noi();
  try {
    let kq = await nang_cap_csdl(client.db(csdl), csdl, { chi_kiem_tra: true, ghi });
    if (kq.thieu_quyen.length > 0 && kq.co_the_cap_quyen && kq.nguoi_dung_hien_tai && !chi_kiem_tra) {
      const tra_loi = dong_y_het ? 'c' : await hoi(`User "${kq.nguoi_dung_hien_tai.ten}" thiếu quyền trên "${csdl}". Cấp vai trò dbOwner trên "${csdl}" cho user này? (c/k)`, 'k');
      if (tra_loi.toLowerCase().startsWith('c')) {
        await cap_quyen_db_owner(client.db(kq.nguoi_dung_hien_tai.db), kq.nguoi_dung_hien_tai.ten, csdl);
        console.log('  Đã cấp dbOwner. Kết nối lại để áp dụng…');
        await client.close();
        client = await ket_noi();
        kq = await nang_cap_csdl(client.db(csdl), csdl, { chi_kiem_tra: true, ghi });
      }
    }
    in_bao_cao(kq);
    if (kq.loi.length > 0) { process.exitCode = 1; console.log('\nKhông chạy nâng cấp vì còn lỗi ở trên.'); return; }
    if (chi_kiem_tra) return;

    const ket_qua = await nang_cap_csdl(client.db(csdl), csdl, {
      ghi,
      xac_nhan: async () => dong_y_het || (await hoi('\nTiếp tục nâng cấp? (c/k)', 'k')).toLowerCase().startsWith('c'),
    });
    if (ket_qua.da_huy) { console.log('Đã hủy, không thay đổi gì.'); return; }
    for (const c of ket_qua.canh_bao.filter((x) => /không đạt validator/.test(x))) console.log(`  ! ${c}`);
    console.log(`\nXong. CSDL ở phiên bản ${PHIEN_BAN_SCHEMA}. ${ket_qua.da_chay.length > 0 ? `Đã chạy các bước: ${ket_qua.da_chay.join(', ')}.` : 'Không có bước nào cần chạy (đã ép lại cấu trúc).'}`);
    console.log('Tiếp theo: khởi động lại dịch vụ API (Restart-Service HrmApi); nạp dữ liệu mẫu (tùy chọn): npm run nap_du_lieu_mau --workspace server');
  } finally {
    await client.close();
  }
}

module.exports = { chay_cli };
