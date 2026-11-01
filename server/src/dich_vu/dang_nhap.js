'use strict';
const crypto = require('node:crypto');
const { HANH_DONG_NHAT_KY, KET_QUA_NHAT_KY } = require('@hrm/shared');
const { Loi } = require('../tien_ich/loi_ung_dung');
const { chuan_hoa_ten_dang_nhap } = require('../tien_ich/chuan_hoa');
const { ho_so_tai_khoan } = require('./phan_quyen');

/**
 * Luồng đăng nhập:
 *  1. giữ chỗ lượt thử (giới hạn theo tài khoản + IP) → bị chặn thì 429, không kiểm tra mật khẩu;
 *  2. tìm tài khoản, so mật khẩu (luôn tốn thời gian như nhau kể cả khi tài khoản không tồn tại);
 *  3. sai → 401 chung một thông điệp; đúng → ghi nhật ký (bắt buộc) rồi mới cấp token.
 */
function tao_dich_vu_dang_nhap({ kho_nguoi_dung, gioi_han, nhat_ky, mat_khau, token, bi_mat_tham_chieu, log = { loi() {} } }) {
  /** Cập nhật bộ đếm hiển thị trên nguoi_dung; lỗi ở đây không được làm hỏng luồng đăng nhập. */
  async function ghi_chu_bo_dem(ham, tk) {
    try { await ham.call(kho_nguoi_dung, String(tk._id)); } catch (loi) { log.loi('Không cập nhật được bộ đếm đăng nhập', { loi }); }
  }

  /** Tên gõ vào mà không có thật có thể là mật khẩu gõ nhầm chỗ → không ghi chữ rõ, chỉ ghi mã tham chiếu. */
  function tham_chieu_ten_la(ten) {
    const ma = crypto.createHmac('sha256', `nhat_ky|${bi_mat_tham_chieu}`).update(ten).digest('hex').slice(0, 12);
    return `khong_ton_tai:${ma}`;
  }

  async function dang_nhap({ ten_dang_nhap, mat_khau: mk, ip, may, phien_ban_ung_dung = null }) {
    const ten = chuan_hoa_ten_dang_nhap(ten_dang_nhap);
    const may_ghi = { ten: may || null, ip };
    const chung = { hanh_dong: HANH_DONG_NHAT_KY.DANG_NHAP, may: may_ghi, phien_ban_ung_dung };

    const giu = await gioi_han.giu_cho_dang_nhap({ ten, ip });
    if (giu.bi_khoa) {
      await nhat_ky.ghi_co_gang({
        ...chung, ket_qua: KET_QUA_NHAT_KY.TU_CHOI,
        tai_khoan: { id: null, ten: null, tham_chieu: tham_chieu_ten_la(ten) },
        chi_tiet: { ly_do: 'tam_khoa', thu_lai_sau_giay: giu.thu_lai_sau_giay },
      });
      throw Loi.tam_khoa(giu.thu_lai_sau_giay);
    }

    const tk = await kho_nguoi_dung.tim_theo_ten(ten);
    let dung_mat_khau = false;
    if (tk) dung_mat_khau = await mat_khau.so_sanh(mk, tk.mat_khau_bam);
    else await mat_khau.so_sanh_gia(mk);

    if (!tk || !dung_mat_khau || tk.khoa === true) {
      let ly_do = 'khong_ton_tai';
      if (tk) ly_do = dung_mat_khau ? 'tai_khoan_bi_khoa' : 'sai_mat_khau';
      await nhat_ky.ghi_co_gang({
        ...chung, ket_qua: KET_QUA_NHAT_KY.THAT_BAI,
        tai_khoan: tk ? { id: String(tk._id), ten: tk.ten_dang_nhap } : { id: null, ten: null, tham_chieu: tham_chieu_ten_la(ten) },
        chi_tiet: { ly_do },
      });
      if (tk && !dung_mat_khau) await ghi_chu_bo_dem(kho_nguoi_dung.ghi_nhan_dang_nhap_sai, tk);
      throw Loi.sai_thong_tin_dang_nhap();
    }

    // Không ghi được nhật ký thì không cho đăng nhập (đóng khi lỗi).
    try {
      await nhat_ky.ghi({
        ...chung, ket_qua: KET_QUA_NHAT_KY.THANH_CONG,
        tai_khoan: { id: String(tk._id), ten: tk.ten_dang_nhap },
      });
    } catch {
      throw Loi.dich_vu_khong_san_sang();
    }
    await gioi_han.ghi_nhan_thanh_cong(giu.luot);
    await ghi_chu_bo_dem(kho_nguoi_dung.ghi_nhan_dang_nhap_dung, tk);

    const { token: chuoi_token, het_han_luc } = token.ky({ id: String(tk._id), so_phien_token: tk.so_phien_token });
    return { token: chuoi_token, het_han_luc, tai_khoan: ho_so_tai_khoan(tk) };
  }

  return Object.freeze({ dang_nhap });
}

module.exports = { tao_dich_vu_dang_nhap };
