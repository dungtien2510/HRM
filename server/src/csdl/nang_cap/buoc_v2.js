'use strict';
/**
 * Bước nâng cấp → phiên bản 2 (từ rỗng hoặc từ cấu trúc Bước 1). Mọi thao tác idempotent: bị ngắt giữa chừng
 * thì chạy lại lệnh nâng cấp là tiếp tục được. Thứ tự có chủ ý:
 *   1. tạo nguoi_dung (có validator) → 2. chép tai_khoan sang → 3. đổi tên tai_khoan thành bản sao lưu
 *   → 4. chuyển cau_hinh → 5. ép cấu trúc cả 6 collection → 6. cập nhật vai trò → 7. ghi schema_version = 2.
 * Dữ liệu cũ KHÔNG bị xóa: tai_khoan được đổi tên thành tai_khoan_v1_sao_luu.
 */
const {
  ten_cac_collection, dam_bao_collection, dam_bao_chi_muc, dam_bao_cau_truc, dem_vi_pham,
  gieo_cau_hinh, dam_bao_vai_tro,
} = require('../cau_truc');
const { chuyen_tai_khoan_v1, kiem_tra_tai_khoan_v1, chuyen_cau_hinh_v1 } = require('./chuyen_doi_v1');

const BAN_SAO_LUU = 'tai_khoan_v1_sao_luu';

async function kiem_tra_truoc_v2(ctx) {
  const { db } = ctx;
  const ket_qua = { loi: [], canh_bao: [], thong_tin: [] };
  const ten_co = await ten_cac_collection(db);

  if (ten_co.has('tai_khoan')) {
    const cu = await db.collection('tai_khoan').find({}).toArray();
    ket_qua.thong_tin.push(`Sẽ chuyển ${cu.length} tài khoản từ tai_khoan sang nguoi_dung (giữ nguyên _id), rồi đổi tên tai_khoan thành ${BAN_SAO_LUU}.`);
    const da_thay = new Set();
    for (const t of cu) {
      for (const v of kiem_tra_tai_khoan_v1(t)) ket_qua.loi.push(`tai_khoan ${String(t.ten_dang_nhap || t._id)}: ${v}`);
      if (da_thay.has(t.ten_dang_nhap)) ket_qua.loi.push(`tai_khoan: trùng tên đăng nhập ${t.ten_dang_nhap}`);
      da_thay.add(t.ten_dang_nhap);
    }
    if (cu.filter((t) => t.loai === 'admin').length > 1) ket_qua.loi.push('tai_khoan: có hơn một admin (hệ thống chỉ cho phép một).');
    if (ten_co.has(BAN_SAO_LUU)) ket_qua.canh_bao.push(`Đã có ${BAN_SAO_LUU}; tai_khoan hiện tại sẽ được đổi sang tên có hậu tố thời gian.`);
  }
  if (ten_co.has('nguoi_dung')) {
    const n = await db.collection('nguoi_dung').countDocuments({});
    if (n > 0) ket_qua.canh_bao.push(`nguoi_dung đã có ${n} tài liệu; tài liệu trùng _id sẽ được ghi đè theo tai_khoan.`);
  }
  for (const ten of ['nhan_su', 'nghi_phep', 'nhat_ky']) {
    if (!ten_co.has(ten)) continue;
    const sai = await dem_vi_pham(db, ten);
    if (sai > 0) ket_qua.canh_bao.push(`${ten}: ${sai} tài liệu hiện có KHÔNG đạt validator mới (không bị xóa; chỉ bị từ chối khi sửa).`);
  }
  return ket_qua;
}

async function chuyen_tai_khoan(ctx, ten_co) {
  const { db, ghi, bay_gio } = ctx;
  if (!ten_co.has('tai_khoan')) return;
  const cu = await db.collection('tai_khoan').find({}).toArray();
  for (const t of cu) {
    await db.collection('nguoi_dung').replaceOne({ _id: t._id }, chuyen_tai_khoan_v1(t, bay_gio), { upsert: true });
  }
  const da_chep = await db.collection('nguoi_dung').countDocuments({});
  if (da_chep < cu.length) throw new Error(`Chép tài khoản thiếu: nguoi_dung có ${da_chep}, tai_khoan có ${cu.length}.`);
  ghi('thong_tin', `Đã chép ${cu.length} tài khoản sang nguoi_dung.`);
  const dich = ten_co.has(BAN_SAO_LUU) ? `${BAN_SAO_LUU}_${bay_gio.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}` : BAN_SAO_LUU;
  await db.collection('tai_khoan').rename(dich);
  ghi('thong_tin', `Đã đổi tên tai_khoan → ${dich} (bản sao lưu, có thể xóa thủ công khi đã yên tâm).`);
}

async function chuyen_cau_hinh(ctx) {
  const { db, bay_gio } = ctx;
  const hien = await db.collection('cau_hinh').findOne({ _id: 'he_thong' });
  if (!hien) { await gieo_cau_hinh(db, { bay_gio, schema_version: 0 }); return; }
  const moi = chuyen_cau_hinh_v1(hien, bay_gio);
  await db.collection('cau_hinh').replaceOne({ _id: 'he_thong' }, moi);
}

async function chay_v2(ctx) {
  const { db, csdl, ghi, bay_gio } = ctx;
  const ten_co = await ten_cac_collection(db);

  ghi('buoc', '1/6 Tạo nguoi_dung (validator + chỉ mục)');
  await dam_bao_collection(db, 'nguoi_dung');
  await dam_bao_chi_muc(db, 'nguoi_dung');

  ghi('buoc', '2/6 Chuyển tai_khoan → nguoi_dung');
  await chuyen_tai_khoan(ctx, ten_co);

  ghi('buoc', '3/6 Chuyển cấu hình hệ thống (cau_hinh)');
  if (!ten_co.has('cau_hinh')) await db.createCollection('cau_hinh');
  await chuyen_cau_hinh(ctx);

  ghi('buoc', '4/6 Ép cấu trúc đủ sáu collection (validator + chỉ mục)');
  await dam_bao_cau_truc(db, { ghi });

  ghi('buoc', '5/6 Cập nhật vai trò ứng dụng (quyền tối thiểu)');
  try {
    const kq = await dam_bao_vai_tro(db, csdl);
    ghi(kq === 'cap_nhat' ? 'thong_tin' : 'canh_bao', kq === 'cap_nhat'
      ? 'Đã cập nhật đặc quyền của vai trò ứng dụng.'
      : 'Chưa có vai trò ứng dụng — hãy chạy "npm run khoi_tao_mongo" để tạo vai trò và user ứng dụng.');
  } catch (loi) {
    ghi('canh_bao', `Không cập nhật được vai trò (${loi.message}). Chạy "npm run khoi_tao_mongo" bằng user quản trị để cập nhật.`);
  }

  ghi('buoc', '6/6 Ghi schema_version = 2');
  await db.collection('cau_hinh').updateOne({ _id: 'he_thong' }, { $set: { schema_version: 2, updated_at: bay_gio } });
}

module.exports = { kiem_tra_truoc_v2, chay_v2, BAN_SAO_LUU };
