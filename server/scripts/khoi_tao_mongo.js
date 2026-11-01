'use strict';
/**
 * Khởi tạo bảo mật MongoDB (chạy MỘT LẦN sau khi cài MongoDB đã bật xác thực; chạy lại để cập nhật quyền):
 *   1. Tạo user quản trị MongoDB (chỉ quản lý user/role) bằng "localhost exception" — chỉ dùng được từ chính máy chủ.
 *   2. Tạo vai trò vai_tro_hrm_ung_dung: quyền tối thiểu trên đúng MỘT CSDL, nhat_ky chỉ đọc + thêm.
 *   3. Tạo/cập nhật user ứng dụng (MONGO_NGUOI_DUNG / MONGO_MAT_KHAU trong .env) với vai trò đó.
 * (Bước 2) Cấu trúc collection/validator/chỉ mục do `npm run khoi_tao_csdl` tạo, không phải script này.
 * Mật khẩu quản trị MongoDB không được lưu ở đâu cả — hãy cất vào nơi an toàn.
 */
const { MongoClient } = require('mongodb');
const { nap_tep_env, hoi, hoi_an } = require('./nhap_lieu');
const { VAI_TRO_UNG_DUNG, tao_dac_quyen } = require('../src/kho/danh_sach_collection');
const { kiem_tra_do_manh } = require('../src/dich_vu/mat_khau');


async function ket_noi(may, cong, tai_khoan) {
  const tuy_chon = { directConnection: true, serverSelectionTimeoutMS: 5000, appName: 'hrm-khoi-tao' };
  if (tai_khoan) Object.assign(tuy_chon, { auth: { username: tai_khoan.ten, password: tai_khoan.mat_khau }, authSource: 'admin' });
  const client = new MongoClient(`mongodb://${may}:${cong}/`, tuy_chon);
  await client.connect();
  return client;
}

function la_loi_chua_xac_thuc(loi) {
  return loi && (loi.code === 13 || /requires authentication|not authorized|Unauthorized/i.test(String(loi.message)));
}

async function main() {
  nap_tep_env();
  const may = process.env.MONGO_MAY || '127.0.0.1';
  const cong = Number(process.env.MONGO_CONG || 27017);
  const csdl = process.env.MONGO_CSDL || 'hrm_nhan_su';
  const nguoi_dung_ung_dung = process.env.MONGO_NGUOI_DUNG;
  const mat_khau_ung_dung = process.env.MONGO_MAT_KHAU;
  if (!nguoi_dung_ung_dung || !mat_khau_ung_dung) throw new Error('Thiếu MONGO_NGUOI_DUNG / MONGO_MAT_KHAU trong .env');
  if (!['127.0.0.1', 'localhost', '::1'].includes(may)) throw new Error('MONGO_MAY phải là 127.0.0.1 hoặc localhost');
  if (!/^[A-Za-z0-9_]{1,64}$/.test(csdl)) throw new Error('MONGO_CSDL không hợp lệ');

  console.log(`MongoDB ${may}:${cong}, CSDL ứng dụng: ${csdl}`);
  const ten_quan_tri = await hoi('Tên user quản trị MongoDB', 'hrm_quan_tri_mongo');
  const mk_quan_tri = await hoi_an('Mật khẩu user quản trị MongoDB (từ 12 ký tự)');
  const loi_mk = kiem_tra_do_manh(mk_quan_tri, ten_quan_tri);
  if (loi_mk.length) throw new Error(loi_mk.join(' '));

  // Bước 1: tạo user quản trị bằng localhost exception (nếu đã có thì sẽ bị từ chối → dùng user có sẵn).
  let client = await ket_noi(may, cong);
  try {
    await client.db('admin').command({
      createUser: ten_quan_tri, pwd: mk_quan_tri, roles: [{ role: 'userAdminAnyDatabase', db: 'admin' }],
    });
    console.log('Đã tạo user quản trị MongoDB.');
  } catch (loi) {
    if (!la_loi_chua_xac_thuc(loi)) throw loi;
    console.log('MongoDB đã có user quản trị — dùng thông tin vừa nhập để đăng nhập.');
  } finally {
    await client.close();
  }

  client = await ket_noi(may, cong, { ten: ten_quan_tri, mat_khau: mk_quan_tri });
  try {
    const db = client.db(csdl);
    const dac_quyen = tao_dac_quyen(csdl);

    const vai_tro = await db.command({ rolesInfo: VAI_TRO_UNG_DUNG });
    if (vai_tro.roles.length > 0) await db.command({ updateRole: VAI_TRO_UNG_DUNG, privileges: dac_quyen, roles: [] });
    else await db.command({ createRole: VAI_TRO_UNG_DUNG, privileges: dac_quyen, roles: [] });
    console.log(`Vai trò ${VAI_TRO_UNG_DUNG}: đã cập nhật.`);

    const roles = [{ role: VAI_TRO_UNG_DUNG, db: csdl }];
    const nguoi_dung = await db.command({ usersInfo: nguoi_dung_ung_dung });
    if (nguoi_dung.users.length > 0) await db.command({ updateUser: nguoi_dung_ung_dung, pwd: mat_khau_ung_dung, roles });
    else await db.command({ createUser: nguoi_dung_ung_dung, pwd: mat_khau_ung_dung, roles });
    console.log(`User ứng dụng "${nguoi_dung_ung_dung}" trên CSDL "${csdl}": đã cập nhật.`);
  } finally {
    await client.close();
  }
  console.log('Xong. Tiếp theo: npm run khoi_tao_csdl (tạo collection, validator, chỉ mục), rồi npm run tao_admin');
}

main().catch((loi) => {
  console.error(`LỖI: ${loi.message}`);
  process.exit(1);
});
