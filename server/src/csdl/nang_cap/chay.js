'use strict';
/**
 * Bộ chạy nâng cấp cấu trúc CSDL theo schema_version.
 * Quy trình: xác định phiên bản hiện tại → lập kế hoạch → KIỂM TRA TRƯỚC (phiên bản MongoDB, đặc quyền,
 * dữ liệu cũ có chuyển được không) → xác nhận → chạy từng bước → xác minh. Chạy lại bất cứ lúc nào được.
 */
const { PHIEN_BAN_SCHEMA, dam_bao_cau_truc, dam_bao_vai_tro, dem_vi_pham } = require('../cau_truc');
const { DANH_SACH_COLLECTION } = require('../chi_muc');
const { doc_trang_thai } = require('./trang_thai');
const { kiem_tra_truoc_chung } = require('./kiem_tra_truoc');
const { kiem_tra_truoc_v2, chay_v2 } = require('./buoc_v2');

/** Mỗi bước đưa CSDL lên phiên bản `den`. Thêm bước mới = thêm phần tử (và tăng PHIEN_BAN_SCHEMA). */
const CAC_BUOC = Object.freeze([
  Object.freeze({
    den: 2,
    ten: 'Sáu collection có JSON Schema validator; tai_khoan → nguoi_dung; cau_hinh mở rộng',
    kiem_tra_truoc: kiem_tra_truoc_v2,
    chay: chay_v2,
  }),
]);

async function nang_cap_csdl(db, csdl, tuy_chon = {}) {
  const {
    chi_kiem_tra = false, xac_nhan = async () => true, ghi = () => {}, dong_ho = () => new Date(),
    cac_buoc = CAC_BUOC, phien_ban_dich = PHIEN_BAN_SCHEMA,
  } = tuy_chon;
  const trang_thai = await doc_trang_thai(db);
  const kq = {
    hien_tai: trang_thai.hien_tai, dich: phien_ban_dich, ke_hoach: [], loi: [], canh_bao: [], thong_tin: [],
    da_chay: [], vi_pham_du_lieu: {}, da_huy: false, da_hoan_tat: false, thieu_quyen: [], co_the_cap_quyen: false, nguoi_dung_hien_tai: null,
  };

  if (trang_thai.hien_tai > phien_ban_dich) {
    kq.loi.push(`CSDL đang ở phiên bản ${trang_thai.hien_tai}, MỚI HƠN mã nguồn (${phien_ban_dich}). Hãy cập nhật mã nguồn, không chạy ngược.`);
    return kq;
  }
  const ke_hoach = cac_buoc.filter((b) => b.den > trang_thai.hien_tai && b.den <= phien_ban_dich);
  kq.ke_hoach = ke_hoach.map((b) => ({ den: b.den, ten: b.ten }));
  const ctx = { db, csdl, ghi, bay_gio: dong_ho() };

  const chung = await kiem_tra_truoc_chung(db, csdl);
  for (const k of ['loi', 'canh_bao', 'thong_tin', 'thieu_quyen']) kq[k].push(...chung[k]);
  kq.co_the_cap_quyen = chung.co_the_cap_quyen;
  kq.nguoi_dung_hien_tai = chung.nguoi_dung_hien_tai;
  for (const b of ke_hoach) {
    const k = await b.kiem_tra_truoc(ctx);
    for (const m of ['loi', 'canh_bao', 'thong_tin']) kq[m].push(...k[m]);
  }
  if (kq.loi.length > 0 || chi_kiem_tra) return kq;

  if (ke_hoach.length > 0 && !(await xac_nhan(kq))) { kq.da_huy = true; return kq; }

  for (const b of ke_hoach) {
    ghi('buoc', `Nâng cấp lên phiên bản ${b.den}: ${b.ten}`);
    try {
      await b.chay(ctx);
    } catch (loi) {
      loi.message = `Nâng cấp lên phiên bản ${b.den} dừng giữa chừng: ${loi.message}. Dữ liệu cũ không bị xóa; sau khi xử lý lỗi hãy chạy lại lệnh (các bước chạy lại được).`;
      throw loi;
    }
    kq.da_chay.push(b.den);
  }
  if (ke_hoach.length === 0) {
    ghi('buoc', 'Đã đúng phiên bản — ép lại validator, chỉ mục và vai trò (chạy lại an toàn)');
    await dam_bao_cau_truc(db, { ghi });
    try { await dam_bao_vai_tro(db, csdl); } catch (loi) { ghi('canh_bao', `Không cập nhật được vai trò: ${loi.message}`); }
  }
  for (const ten of DANH_SACH_COLLECTION) kq.vi_pham_du_lieu[ten] = await dem_vi_pham(db, ten);
  for (const [ten, so] of Object.entries(kq.vi_pham_du_lieu)) if (so > 0) kq.canh_bao.push(`${ten}: ${so} tài liệu không đạt validator hiện hành.`);
  kq.da_hoan_tat = true;
  return kq;
}

module.exports = { nang_cap_csdl, CAC_BUOC };
