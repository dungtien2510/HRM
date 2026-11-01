'use strict';
/**
 * Sinh dữ liệu MẪU GIẢ cho nhan_su và nghi_phep để thử các bước sau. KHÔNG dùng dữ liệu thật:
 *  - tên ghép ngẫu nhiên từ danh sách họ/đệm/tên phổ biến; mã nhân viên dạng MAU0001…;
 *  - số căn cước bắt đầu bằng "000" (mã tỉnh 000 không tồn tại → không thể là số thật), số điện thoại bắt đầu "0000";
 *  - số BHXH/BHYT có tiền tố "MAU"; tên trường/cơ sở đào tạo có hậu tố "(mẫu)"; mọi hồ sơ có la_mau: true.
 * Có seed → cùng seed và cùng ngày tham chiếu cho đúng cùng dữ liệu (kiểm thử lặp lại được).
 * Bảo đảm có: con dưới 6 tuổi (kể cả ca sát ranh giới), kỷ luật còn và đã hết hiệu lực, ngày chỉ có tháng/năm.
 */
const {
  chuan_hoa_nhan_su, chuan_hoa_nghi_phep, moc_sinh_cho_duoi_tuoi, chuan_hoa_ngay_kdd, la_duoi_tuoi, con_hieu_luc, GIA_TRI_KHONG,
} = require('@hrm/shared');

const NGAY_THAM_CHIEU_MAC_DINH = new Date(Date.UTC(2026, 9, 24));
const TIEN_TO_MA = 'MAU';

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const DEM_NAM = ['Văn', 'Hữu', 'Đức', 'Minh', 'Quang', 'Thanh', 'Công', 'Xuân', 'Ngọc', 'Anh'];
const DEM_NU = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Kim', 'Mai', 'Phương', 'Hồng'];
const TEN_NAM = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Hùng', 'Khánh', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Thắng', 'Tuấn', 'Việt', 'Vinh'];
const TEN_NU = ['Anh', 'Chi', 'Dung', 'Giang', 'Hà', 'Hạnh', 'Hoa', 'Hương', 'Lan', 'Linh', 'Mai', 'Ngân', 'Nhung', 'Oanh', 'Phương', 'Thảo', 'Trang', 'Yến'];
const BO_PHAN = ['Kho vận', 'Kỹ thuật', 'Hành chính', 'Tài chính - Kế toán', 'Tổ chức - Cán bộ', 'Bảo vệ', 'Vận tải', 'Kế hoạch'];
const CHUC_VU = ['Nhân viên', 'Tổ trưởng', 'Phó trưởng phòng', 'Trưởng phòng', 'Thủ kho', 'Quản lý kho', 'Kỹ sư', 'Kế toán viên'];
const XA_PHUONG = ['Xã An Phú', 'Phường Bình Minh', 'Xã Tân Lập', 'Phường Hòa Bình', 'Xã Thanh Xuân', 'Phường Phước Long', 'Xã Đông Hà', 'Phường Tây Sơn'];
const TINH_TP = ['Hà Nội', 'Thành phố Huế', 'Đà Nẵng', 'Nghệ An', 'Thanh Hóa', 'Quảng Nam', 'Hải Phòng', 'Cần Thơ'];
const DUONG = ['Lê Lợi', 'Trần Phú', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Quang Trung', 'Lý Thường Kiệt', 'Hùng Vương', 'Phan Chu Trinh'];
const CO_SO_DAO_TAO = ['Trường Đại học Kinh tế (mẫu)', 'Học viện Kỹ thuật (mẫu)', 'Trường Cao đẳng Nghề (mẫu)', 'Trung tâm Bồi dưỡng Chính trị (mẫu)'];
const NGANH = ['Quản trị nhân lực', 'Kế toán', 'Công nghệ thông tin', 'Quản lý kho vận', 'Luật', 'Điện - Điện tử'];
const VAN_BANG = ['Cử nhân', 'Kỹ sư', 'Thạc sĩ', 'Trung cấp', 'Chứng chỉ'];
const HINH_THUC_KHEN = ['Giấy khen', 'Bằng khen', 'Chiến sĩ thi đua cơ sở', 'Lao động tiên tiến'];
const HINH_THUC_KY_LUAT = ['Khiển trách', 'Cảnh cáo', 'Hạ bậc lương'];
const LOAI_PHEP = ['phep_nam', 'phep_nam', 'phep_nam', 'nghi_om', 'viec_rieng', 'khong_luong', 'thai_san', 'khac'];
const THAI_DO = 'Chấp hành nghiêm đường lối, chủ trương của Đảng, chính sách và pháp luật của Nhà nước.';

// ---- bộ sinh số giả ngẫu nhiên có seed (mulberry32) -----------------------
function tao_prng(hat_giong) {
  let a = hat_giong >>> 0;
  return function ngau_nhien() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const khoang = (r, tu, den) => tu + Math.floor(r() * (den - tu + 1));
const chon = (r, ds) => ds[Math.floor(r() * ds.length)];
const co = (r, xac_suat) => r() < xac_suat;
const pad = (n, d) => String(n).padStart(d, '0');
const chu_so = (r, d) => Array.from({ length: d }, () => khoang(r, 0, 9)).join('');

// ---- ngày ------------------------------------------------------------------
const ngay_ngau_nhien = (r, nam_tu, nam_den) => ({ nam: khoang(r, nam_tu, nam_den), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) });
function cat_do_chinh_xac(d, mc) { // mc: 'ngay' | 'thang' | 'nam'
  if (mc === 'nam') return { nam: d.nam };
  if (mc === 'thang') return { nam: d.nam, thang: d.thang };
  return { nam: d.nam, thang: d.thang, ngay: d.ngay };
}
const chon_do_chinh_xac = (r, ti_le_thang = 0.3, ti_le_nam = 0.1) => { const x = r(); return x < ti_le_nam ? 'nam' : (x < ti_le_nam + ti_le_thang ? 'thang' : 'ngay'); };
function cong_thang(d, so_thang) {
  const tong = d.nam * 12 + (d.thang - 1) + so_thang;
  return { nam: Math.floor(tong / 12), thang: (tong % 12) + 1, ngay: d.ngay };
}
const tu_date = (dt) => ({ nam: dt.getUTCFullYear(), thang: dt.getUTCMonth() + 1, ngay: dt.getUTCDate() });
const so_khoa = (d) => d.nam * 10000 + d.thang * 100 + d.ngay;

// ---- thành phần dữ liệu ----------------------------------------------------
function tao_ten(r, gioi) {
  return gioi === 'nam'
    ? `${chon(r, HO)} ${chon(r, DEM_NAM)} ${chon(r, TEN_NAM)}`
    : `${chon(r, HO)} ${chon(r, DEM_NU)} ${chon(r, TEN_NU)}`;
}
function tao_dia_chi(r) {
  return { so_nha_duong: `${khoang(r, 1, 200)} ${chon(r, DUONG)}`, xa_phuong: chon(r, XA_PHUONG), tinh_tp: chon(r, TINH_TP) };
}
const tao_so_can_cuoc = (r) => `000${chu_so(r, 9)}`;
const tao_so_dien_thoai = (r) => `0000${chu_so(r, 6)}`;

function tao_than_nhan(r, { nhom, quan_he, chi_tiet_quan_he, gioi_tinh, ho_ten, ngay_sinh, ket_hon, phu_thuoc, co_dia_chi = true }) {
  const kq = {
    nhom, quan_he, ho_ten, gioi_tinh, ngay_sinh,
    so_can_cuoc: tao_so_can_cuoc(r),
    dan_toc: 'Kinh', ton_giao: GIA_TRI_KHONG, quoc_tich: 'Việt Nam',
    nghe_nghiep_noi_lam_viec: chon(r, ['Công nhân', 'Giáo viên', 'Kinh doanh tự do', 'Nghỉ hưu', 'Lao động tự do', 'Nhân viên văn phòng']),
    thai_do_chinh_tri: THAI_DO,
    tien_an: GIA_TRI_KHONG,
  };
  if (chi_tiet_quan_he) kq.chi_tiet_quan_he = chi_tiet_quan_he;
  if (co_dia_chi) { kq.que_quan = tao_dia_chi(r); kq.noi_thuong_tru = tao_dia_chi(r); kq.noi_o_hien_nay = tao_dia_chi(r); }
  if (quan_he === 'cha' || quan_he === 'me') kq.lien_quan_che_do_cu = GIA_TRI_KHONG;
  if (ket_hon) kq.nam_ket_hon_ly_hon = ket_hon;
  if (phu_thuoc !== undefined) kq.la_nguoi_phu_thuoc = phu_thuoc;
  return kq;
}

/** Kế hoạch đảm bảo các tình huống cần thử (dựa theo chỉ số hồ sơ, không dựa may rủi). */
function ke_hoach(i) {
  return {
    ket_hon: i % 10 !== 9 && i % 10 !== 4, // 80% có gia đình
    co_con_duoi_6: i % 5 === 0,
    con_chi_co_nam: i % 10 === 0,       // con dưới 6 tuổi chỉ ghi năm sinh (ngày không đủ)
    con_ranh_gioi_dung_6: i === 10,     // con đúng 6 tuổi tại ngày tham chiếu → KHÔNG thuộc "dưới 6 tuổi"
    con_ranh_gioi_duoi_6: i === 15,     // con sinh sau mốc 1 ngày → thuộc "dưới 6 tuổi"
    ky_luat: i % 7 === 3,
    ky_luat_con_hieu_luc: Math.floor(i / 7) % 2 === 0,
    tien_an: i % 50 === 7,
    nhieu_nhat: i % 13 === 0,
  };
}

function tao_nhan_su_tho(i, r, ref, tao_id) {
  const kh = ke_hoach(i);
  const ref_d = tu_date(ref);
  const gioi_tinh = co(r, 0.55) ? 'nam' : 'nu';
  const nam_sinh = kh.co_con_duoi_6 ? khoang(r, 1970, 1998) : khoang(r, 1965, 2002);
  const sinh = { nam: nam_sinh, thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) };
  const ho_ten = tao_ten(r, gioi_tinh);
  const trang_thai = nam_sinh <= 1966 && co(r, 0.5) ? 'nghi_huu'
    : (() => { const x = r(); return x < 0.9 ? 'dang_lam_viec' : (x < 0.94 ? 'tam_nghi' : 'nghi_viec'); })();
  const bo_phan = chon(r, BO_PHAN);
  const chuc_vu = chon(r, CHUC_VU);
  const hire = { nam: Math.min(nam_sinh + khoang(r, 21, 28), ref_d.nam - 1), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) };
  const dang_vien = co(r, 0.25);

  const ho_so = {
    ma_nhan_vien: `${TIEN_TO_MA}${pad(i + 1, 4)}`,
    so_hieu: `${khoang(r, 10, 99)}.${khoang(r, 100, 999)}.${khoang(r, 10, 30)}`,
    ho_ten_khai_sinh: ho_ten,
    ten_goi_khac: co(r, 0.05) ? null : (co(r, 0.85) ? GIA_TRI_KHONG : `Bé ${chon(r, TEN_NAM)}`),
    ngay_sinh: sinh,
    gioi_tinh,
    noi_dang_ky_khai_sinh: tao_dia_chi(r),
    que_quan: tao_dia_chi(r),
    dan_toc: co(r, 0.9) ? 'Kinh' : chon(r, ['Tày', 'Nùng', 'Mường', 'Thái']),
    ton_giao: co(r, 0.85) ? GIA_TRI_KHONG : chon(r, ['Phật giáo', 'Công giáo']),
    chuc_vu,
    bo_phan,
    trang_thai_nhan_su: trang_thai,
    noi_thuong_tru: tao_dia_chi(r),
    noi_o_hien_nay: tao_dia_chi(r),
    so_dien_thoai: tao_so_dien_thoai(r),
    so_can_cuoc: tao_so_can_cuoc(r),
    ngay_cap_can_cuoc: new Date(Date.UTC(khoang(r, 2021, 2025), khoang(r, 0, 11), khoang(r, 1, 28))),
    noi_cap_can_cuoc: 'Cơ quan quản lý hành chính (mẫu)',
    cap_uy_hien_tai: dang_vien ? 'Đảng viên' : GIA_TRI_KHONG,
    cap_uy_kiem_nhiem: GIA_TRI_KHONG,
    chuc_vu_kiem_nhiem: GIA_TRI_KHONG,
    nghe_nghiep_truoc_tuyen_dung: chon(r, ['Học sinh', 'Sinh viên', 'Công nhân', 'Bộ đội xuất ngũ']),
    ngay_tuyen_dung_lan_dau: cat_do_chinh_xac(hire, chon_do_chinh_xac(r, 0.35, 0.05)),
    co_quan_tuyen_dung_lan_dau: 'Đơn vị (mẫu)',
    ngay_vao_co_quan_hien_nay: cat_do_chinh_xac(cong_thang(hire, khoang(r, 0, 36)), 'thang'),
    ngach_chuc_danh: chon(r, ['Chuyên viên', 'Kỹ sư chính', 'Kế toán viên', 'Nhân viên']),
    so_truong_cong_tac: chon(r, ['Quản lý kho', 'Kỹ thuật điện', 'Kế toán', 'Tổ chức nhân sự']),
    cong_viec_lam_lau_nhat: chon(r, ['Quản lý kho vận', 'Kỹ thuật', 'Hành chính tổng hợp', 'Kế toán']),
    giao_duc_pho_thong: '12/12',
    nam_tot_nghiep_pho_thong: { nam: nam_sinh + 18 },
    hoc_ham_hoc_vi_cao_nhat: chon(r, VAN_BANG),
    ngoai_ngu: chon(r, ['Tiếng Anh B1', 'Tiếng Anh B2', 'Tiếng Nga A2']),
    tin_hoc: chon(r, ['Chứng chỉ B', 'Chứng chỉ A', 'Cơ bản']),
    ly_luan_chinh_tri: chon(r, ['Sơ cấp', 'Trung cấp', GIA_TRI_KHONG]),
    ma_so_ngach: '01.003',
    so_so_bhxh: `${TIEN_TO_MA}${chu_so(r, 8)}`,
    so_the_bhyt: `${TIEN_TO_MA}${chu_so(r, 10)}`,
    phu_cap_khac: GIA_TRI_KHONG,
    doi_tuong_chinh_sach: GIA_TRI_KHONG,
    co_yeu_to_nuoc_ngoai: i % 40 === 11 ? { co: true, mo_ta: 'Có thời gian học tập ngắn hạn ở nước ngoài (mẫu).' } : { co: false, mo_ta: null },
    lanh_dao_than_nhan_nuoc_ngoai: i % 60 === 13 ? { co: true, mo_ta: 'Anh/chị/em ruột định cư ở nước ngoài (mẫu).' } : { co: false, mo_ta: null },
  };
  if (co(r, 0.15)) ho_so.noi_dang_ky_khai_sinh_sau_sap_nhap = tao_dia_chi(r);
  if (co(r, 0.15)) ho_so.que_quan_sau_sap_nhap = tao_dia_chi(r);
  if (co(r, 0.4)) ho_so.mang_xa_hoi = [{ nen_tang: 'Zalo', tai_khoan: ho_ten, so_dien_thoai: tao_so_dien_thoai(r) }];
  if (co(r, 0.3)) ho_so.phu_cap_chuc_vu = chon(r, [0.1, 0.2, 0.3, 0.5]);
  if (dang_vien) {
    ho_so.ngay_vao_dang = cat_do_chinh_xac({ nam: Math.min(nam_sinh + khoang(r, 20, 30), ref_d.nam - 1), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) }, chon_do_chinh_xac(r, 0.3, 0.1));
    ho_so.ngay_vao_dang_chinh_thuc = cat_do_chinh_xac(cong_thang({ ...ho_so.ngay_vao_dang, thang: ho_so.ngay_vao_dang.thang || 1, ngay: 1 }, 12), 'thang');
  }
  if (co(r, 0.2)) {
    const nhap = { nam: nam_sinh + khoang(r, 18, 22), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) };
    ho_so.ngay_nhap_ngu = cat_do_chinh_xac(nhap, 'thang');
    ho_so.ngay_xuat_ngu = cat_do_chinh_xac(cong_thang(nhap, khoang(r, 24, 72)), 'thang');
    ho_so.quan_ham_chuc_vu_cao_nhat = `${chon(r, ['Hạ sĩ', 'Trung sĩ', 'Thượng sĩ', 'Thiếu úy'])} (${pad(khoang(r, 1, 12), 2)}/${nhap.nam + khoang(r, 2, 6)})`;
  }
  if (co(r, 0.03)) ho_so.chien_dau = [{ tu: { nam: nam_sinh + 19, thang: khoang(r, 1, 12) }, den: { nam: nam_sinh + 20, thang: khoang(r, 1, 12) }, ten_chien_dich_tran_danh: 'Nhiệm vụ diễn tập (mẫu)', chien_truong_dia_diem: 'Địa điểm (mẫu)' }];

  // --- quá trình trước tuyển dụng ---
  ho_so.qua_trinh_truoc_tuyen_dung = [{
    tu: cat_do_chinh_xac({ nam: nam_sinh + 18, thang: 9, ngay: 5 }, 'thang'),
    den: cat_do_chinh_xac(cong_thang({ nam: nam_sinh + 18, thang: 9, ngay: 5 }, 12 * khoang(r, 3, 5)), 'thang'),
    noi_dung: `Học tập tại ${chon(r, CO_SO_DAO_TAO)}`,
  }];

  // --- quá trình công tác ---
  const so_dong = kh.nhieu_nhat ? 4 : khoang(r, 1, 3);
  const tong_thang = Math.max(6, (ref_d.nam - hire.nam) * 12 + (ref_d.thang - hire.thang));
  ho_so.qua_trinh_cong_tac = [];
  for (let k = 0; k < so_dong; k += 1) {
    const tu = cong_thang(hire, Math.floor((tong_thang * k) / so_dong));
    const la_cuoi = k === so_dong - 1;
    const den = la_cuoi ? null : cong_thang(hire, Math.floor((tong_thang * (k + 1)) / so_dong));
    const cd = k === so_dong - 1 ? chuc_vu : chon(r, CHUC_VU);
    const dong = { tu: cat_do_chinh_xac(tu, chon_do_chinh_xac(r, 0.7, 0)), den: den ? cat_do_chinh_xac(den, 'thang') : null, noi_dung: `${cd}, ${bo_phan}, Đơn vị (mẫu)`, chuc_danh: cd, don_vi_cong_tac: bo_phan };
    if (la_cuoi && trang_thai === 'dang_lam_viec') dong.dang_dien_ra = true;
    else if (la_cuoi) { dong.den = cat_do_chinh_xac(tu_date(ref), 'thang'); dong.dang_dien_ra = false; }
    ho_so.qua_trinh_cong_tac.push(dong);
  }

  // --- đào tạo ---
  const so_dao_tao = khoang(r, 1, 3);
  ho_so.dao_tao = [];
  for (let k = 0; k < so_dao_tao; k += 1) {
    const tu = { nam: Math.min(nam_sinh + 19 + k * 4, ref_d.nam - 1), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) };
    const dang_hoc = k === so_dao_tao - 1 && co(r, 0.08);
    ho_so.dao_tao.push({
      ten_co_so_dao_tao: chon(r, CO_SO_DAO_TAO), nganh_hoc_ten_lop: chon(r, NGANH),
      tu: cat_do_chinh_xac(tu, chon_do_chinh_xac(r, 0.5, 0)),
      den: dang_hoc ? null : cat_do_chinh_xac(cong_thang(tu, 12 * khoang(r, 1, 4)), 'thang'),
      dang_dien_ra: dang_hoc, hinh_thuc_dao_tao: chon(r, ['Chính quy', 'Tại chức', 'Từ xa']), van_bang_chung_chi: chon(r, VAN_BANG),
    });
  }

  // --- khen thưởng ---
  const so_khen = co(r, 0.25) ? 0 : khoang(r, 1, 4);
  if (so_khen > 0) {
    ho_so.khen_thuong = [];
    for (let k = 0; k < so_khen; k += 1) {
      const d = { nam: khoang(r, Math.max(2012, hire.nam), ref_d.nam), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) };
      const kk = { thoi_diem: cat_do_chinh_xac(d, chon_do_chinh_xac(r, 0.4, 0.15)), so_quyet_dinh: `${khoang(r, 1, 300)}/QĐ-KT`, co_quan_quyet_dinh: 'Đơn vị (mẫu)', hinh_thuc_khen_thuong: chon(r, HINH_THUC_KHEN) };
      if (co(r, 0.5)) kk.danh_hieu_thi_dua = chon(r, ['Lao động tiên tiến', 'Chiến sĩ thi đua cơ sở']);
      ho_so.khen_thuong.push(kk);
    }
    ho_so.khen_thuong.sort((a, b) => a.thoi_diem.nam - b.thoi_diem.nam || (a.thoi_diem.thang || 0) - (b.thoi_diem.thang || 0));
    if (co(r, 0.1)) ho_so.danh_hieu_duoc_phong = `Danh hiệu mẫu (${khoang(r, 1, 12)}/${ref_d.nam - 1})`;
  }

  // --- lương ---
  const so_luong = khoang(r, 2, 5);
  let he_so = 2.34 + khoang(r, 0, 6) * 0.33;
  ho_so.luong = [];
  for (let k = 0; k < so_luong; k += 1) {
    const tu = cong_thang(hire, Math.floor((tong_thang * k) / so_luong));
    const la_cuoi = k === so_luong - 1;
    const dong = { tu: cat_do_chinh_xac(tu, 'thang'), den: null, bac_luong: `Bậc ${k + 1}`, he_so_luong: Math.round(he_so * 100) / 100 };
    if (la_cuoi) { dong.dang_dien_ra = true; } else { dong.den = cat_do_chinh_xac(cong_thang(hire, Math.floor((tong_thang * (k + 1)) / so_luong)), 'thang'); dong.dang_dien_ra = false; }
    if (co(r, 0.4)) dong.tien_luong_vi_tri_viec_lam = khoang(r, 80, 250) * 100000;
    he_so += 0.33;
    ho_so.luong.push(dong);
  }
  if (trang_thai === 'nghi_viec' || trang_thai === 'nghi_huu') { const l = ho_so.luong[ho_so.luong.length - 1]; l.dang_dien_ra = false; l.den = cat_do_chinh_xac(tu_date(ref), 'thang'); }

  // --- kỷ luật ---
  if (kh.ky_luat) {
    const so = kh.nhieu_nhat ? 2 : 1;
    ho_so.ky_luat = [];
    for (let k = 0; k < so; k += 1) {
      let thoi_diem; let het;
      if (kh.ky_luat_con_hieu_luc && k === 0) {          // còn hiệu lực: xảy ra trong 10 tháng gần đây, hiệu lực 12 tháng (hoặc chưa ghi ngày hết)
        thoi_diem = cong_thang(ref_d, -khoang(r, 1, 10));
        het = co(r, 0.25) ? null : cat_do_chinh_xac(cong_thang(thoi_diem, 12), 'thang');
      } else {                                            // đã hết hiệu lực: cách đây 2–5 năm, hiệu lực 12 tháng
        thoi_diem = cong_thang(ref_d, -khoang(r, 24, 60) - k * 7);
        het = cat_do_chinh_xac(cong_thang(thoi_diem, 12), 'thang');
      }
      const dong = {
        loai: chon(r, ['dang', 'chinh_quyen']), thoi_diem: cat_do_chinh_xac(thoi_diem, chon_do_chinh_xac(r, 0.4, 0)),
        so_quyet_dinh: `${khoang(r, 1, 99)}/QĐ-KL`, co_quan_ban_hanh: 'Đơn vị (mẫu)', hinh_thuc: chon(r, HINH_THUC_KY_LUAT), hanh_vi_vi_pham: 'Vi phạm nội quy (mẫu)',
      };
      if (het) dong.het_hieu_luc = het; else dong.het_hieu_luc = null;
      ho_so.ky_luat.push(dong);
    }
  }
  if (kh.tien_an) {
    ho_so.tien_an_tien_su = [{ loai: 'tien_su', thoi_diem: cat_do_chinh_xac(cong_thang(ref_d, -khoang(r, 120, 200)), 'nam'), so_ban_an_quyet_dinh: 'Số mẫu 01', co_quan_ban_hanh: 'Cơ quan (mẫu)', hinh_thuc: 'Hình thức (mẫu)', hanh_vi_vi_pham: 'Nội dung (mẫu)' }];
  }

  // --- thân nhân ---
  const than_nhan = [];
  const ho_cha = ho_ten.split(' ')[0];
  const sinh_cha_me = () => cat_do_chinh_xac({ nam: nam_sinh - khoang(r, 24, 34), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) }, chon_do_chinh_xac(r, 0.2, 0.15));
  than_nhan.push(tao_than_nhan(r, { nhom: 'cua_ban_than', quan_he: 'cha', gioi_tinh: 'nam', ho_ten: `${ho_cha} ${chon(r, DEM_NAM)} ${chon(r, TEN_NAM)}`, ngay_sinh: sinh_cha_me() }));
  than_nhan.push(tao_than_nhan(r, { nhom: 'cua_ban_than', quan_he: 'me', gioi_tinh: 'nu', ho_ten: tao_ten(r, 'nu'), ngay_sinh: sinh_cha_me() }));
  for (let k = khoang(r, 0, 3); k > 0; k -= 1) {
    const g = co(r, 0.5) ? 'nam' : 'nu';
    than_nhan.push(tao_than_nhan(r, { nhom: 'cua_ban_than', quan_he: 'anh_chi_em', chi_tiet_quan_he: co(r, 0.5) ? 'anh' : 'em', gioi_tinh: g, ho_ten: `${ho_cha} ${g === 'nam' ? chon(r, DEM_NAM) : chon(r, DEM_NU)} ${g === 'nam' ? chon(r, TEN_NAM) : chon(r, TEN_NU)}`, ngay_sinh: { nam: nam_sinh + khoang(r, -6, 6), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) } }));
  }
  if (kh.ket_hon) {
    const gioi_vc = gioi_tinh === 'nam' ? 'nu' : 'nam';
    const nam_con_dau = ref_d.nam - khoang(r, 0, 2);
    const nam_ket_hon = kh.co_con_duoi_6 ? Math.max(nam_sinh + 22, Math.min(ref_d.nam - 6 + 1, nam_con_dau) - khoang(r, 0, 2)) : Math.min(nam_sinh + khoang(r, 22, 32), ref_d.nam - 1);
    than_nhan.push(tao_than_nhan(r, {
      nhom: 'cua_ban_than', quan_he: gioi_tinh === 'nam' ? 'vo' : 'chong', gioi_tinh: gioi_vc, ho_ten: tao_ten(r, gioi_vc),
      ngay_sinh: { nam: nam_sinh + khoang(r, -5, 5), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) }, ket_hon: { tinh_trang: 'ket_hon', nam: Math.min(nam_ket_hon, ref_d.nam) },
    }));
    // con
    const moc6 = tu_date(moc_sinh_cho_duoi_tuoi(6, ref));
    const them_con = (g, sinh_con, phu_thuoc) => than_nhan.push(tao_than_nhan(r, {
      nhom: 'cua_ban_than', quan_he: 'con', chi_tiet_quan_he: 'de', gioi_tinh: g, ho_ten: `${ho_cha} ${g === 'nam' ? chon(r, DEM_NAM) : chon(r, DEM_NU)} ${g === 'nam' ? chon(r, TEN_NAM) : chon(r, TEN_NU)}`,
      ngay_sinh: sinh_con, phu_thuoc, co_dia_chi: false,
    }));
    if (kh.co_con_duoi_6) {
      const tuoi_thang = khoang(r, 1, 70); // 1–70 tháng tuổi (< 6 tuổi = 72 tháng)
      const d = cong_thang({ ...ref_d, ngay: Math.min(ref_d.ngay, 28) }, -tuoi_thang);
      const mc = kh.con_chi_co_nam ? 'nam' : chon_do_chinh_xac(r, 0.3, 0);
      const sinh_con = mc === 'nam' ? { nam: Math.max(d.nam, moc6.nam + 1) } : cat_do_chinh_xac(d, mc);
      them_con(co(r, 0.5) ? 'nam' : 'nu', sinh_con, true);
    }
    if (kh.con_ranh_gioi_dung_6) them_con('nam', moc6, true);
    if (kh.con_ranh_gioi_duoi_6) them_con('nu', tu_date(new Date(moc_sinh_cho_duoi_tuoi(6, ref).getTime() + 24 * 60 * 60 * 1000)), true);
    if (!kh.co_con_duoi_6 && co(r, 0.5) && nam_sinh <= 1995) {
      const tuoi_con = khoang(r, 7, Math.min(24, ref_d.nam - nam_sinh - 20));
      if (tuoi_con >= 7) them_con(co(r, 0.5) ? 'nam' : 'nu', { nam: ref_d.nam - tuoi_con, thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) }, tuoi_con < 18);
    }
    if (co(r, 0.6)) {
      than_nhan.push(tao_than_nhan(r, { nhom: 'cua_vo_chong', quan_he: 'cha', gioi_tinh: 'nam', ho_ten: tao_ten(r, 'nam'), ngay_sinh: sinh_cha_me() }));
      than_nhan.push(tao_than_nhan(r, { nhom: 'cua_vo_chong', quan_he: 'me', gioi_tinh: 'nu', ho_ten: tao_ten(r, 'nu'), ngay_sinh: sinh_cha_me() }));
      if (co(r, 0.4)) than_nhan.push(tao_than_nhan(r, { nhom: 'cua_vo_chong', quan_he: 'anh_chi_em', chi_tiet_quan_he: 'em', gioi_tinh: 'nam', ho_ten: tao_ten(r, 'nam'), ngay_sinh: { nam: nam_sinh + khoang(r, -3, 8), thang: khoang(r, 1, 12), ngay: khoang(r, 1, 28) } }));
    }
  }
  ho_so.than_nhan = than_nhan;

  // --- kỹ thuật ---
  ho_so.version = 1;
  ho_so.created_at = new Date(ref.getTime());
  ho_so.updated_at = new Date(ref.getTime());
  ho_so.la_mau = true;
  return ho_so;
}

function tao_nghi_phep(r, nhan_su, i, ref, tao_id) {
  const ban_ghi = [];
  if (!co(r, 0.7)) return ban_ghi;
  const so = khoang(r, 1, 4);
  for (let k = 0; k < so; k += 1) {
    const lui = khoang(r, 0, 700); // trong ~2 năm gần đây
    const tu = new Date(ref.getTime() - lui * 86400000);
    const so_ngay = khoang(r, 1, 10);
    const den = new Date(tu.getTime() + (so_ngay - 1) * 86400000);
    const loai_phep = chon(r, LOAI_PHEP);
    const bg = {
      _id: tao_id(), nhan_su_id: nhan_su._id, tu_ngay: tu, den_ngay: den, loai_phep, so_ngay, created_at: new Date(ref.getTime()), updated_at: new Date(ref.getTime()), la_mau: true,
    };
    if (co(r, 0.4)) bg.ghi_chu = `Ghi chú mẫu ${i + 1}-${k + 1}`;
    ban_ghi.push(chuan_hoa_nghi_phep(bg));
  }
  return ban_ghi;
}

/**
 * @param {object} tuy_chon
 * @param {number} [tuy_chon.so_luong=200]
 * @param {number} [tuy_chon.hat_giong=20261024]
 * @param {Date}   [tuy_chon.ngay_tham_chieu]
 * @param {() => any} tuy_chon.tao_id  hàm tạo ObjectId (new ObjectId())
 */
function tao_du_lieu_mau({ so_luong = 200, hat_giong = 20261024, ngay_tham_chieu = NGAY_THAM_CHIEU_MAC_DINH, tao_id } = {}) {
  if (typeof tao_id !== 'function') throw new TypeError('Cần truyền tao_id (hàm tạo ObjectId).');
  const ref = new Date(Date.UTC(ngay_tham_chieu.getUTCFullYear(), ngay_tham_chieu.getUTCMonth(), ngay_tham_chieu.getUTCDate()));
  const r = tao_prng(hat_giong);
  const nhan_su = [];
  const nghi_phep = [];
  for (let i = 0; i < so_luong; i += 1) {
    const tho = tao_nhan_su_tho(i, r, ref, tao_id);
    const ho_so = chuan_hoa_nhan_su({ ...tho, _id: tao_id() }, { tao_id });
    nhan_su.push(ho_so);
    nghi_phep.push(...tao_nghi_phep(r, ho_so, i, ref, tao_id));
  }
  return { nhan_su, nghi_phep, ngay_tham_chieu: ref };
}

/** Thống kê để kiểm tra bộ mẫu có đủ các tình huống cần thử. */
function thong_ke_du_lieu_mau({ nhan_su, nghi_phep }, ngay_tham_chieu) {
  let co_con_duoi_6 = 0; let tong_con_duoi_6 = 0; let ky_luat_con = 0; let ky_luat_het = 0; let co_ngay_thang = 0; let co_ngay_nam = 0; let co_tien_an = 0;
  const dem_do_chinh_xac = (v) => { if (v && typeof v === 'object' && 'do_chinh_xac' in v) { if (v.do_chinh_xac === 'thang') co_ngay_thang += 1; if (v.do_chinh_xac === 'nam') co_ngay_nam += 1; } };
  const duyet = (x) => { if (Array.isArray(x)) x.forEach(duyet); else if (x && typeof x === 'object' && !(x instanceof Date)) { dem_do_chinh_xac(x); Object.values(x).forEach(duyet); } };
  for (const h of nhan_su) {
    const con_nho = (h.than_nhan || []).filter((t) => t.quan_he === 'con' && t.ngay_sinh && la_duoi_tuoi(t.ngay_sinh, 6, ngay_tham_chieu));
    if (con_nho.length > 0) { co_con_duoi_6 += 1; tong_con_duoi_6 += con_nho.length; }
    for (const kl of h.ky_luat || []) { if (con_hieu_luc(kl, ngay_tham_chieu)) ky_luat_con += 1; else ky_luat_het += 1; }
    if ((h.tien_an_tien_su || []).length > 0) co_tien_an += 1;
    duyet(h);
  }
  return {
    tong_nhan_su: nhan_su.length, tong_nghi_phep: nghi_phep.length, nhan_su_co_con_duoi_6: co_con_duoi_6, tong_con_duoi_6,
    ky_luat_con_hieu_luc: ky_luat_con, ky_luat_het_hieu_luc: ky_luat_het, ngay_chi_co_thang_nam: co_ngay_thang, ngay_chi_co_nam: co_ngay_nam, nhan_su_co_tien_an_tien_su: co_tien_an,
  };
}

module.exports = { tao_du_lieu_mau, thong_ke_du_lieu_mau, tao_prng, NGAY_THAM_CHIEU_MAC_DINH, TIEN_TO_MA };
