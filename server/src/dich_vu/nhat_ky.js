'use strict';
const { che } = require('../tien_ich/che_log');

/**
 * Nhật ký chỉ ghi thêm (quy tắc 3). Mỗi bản ghi: tài khoản, thời điểm, máy.
 * chi_tiet luôn đi qua che() nên mật khẩu, token, số căn cước không lọt vào.
 */
function tao_dich_vu_nhat_ky({ kho, log, dong_ho = Date.now }) {
  function dung_ban_ghi({ hanh_dong, ket_qua, tai_khoan = null, may = null, phien_ban_ung_dung = null, chi_tiet = null }) {
    return {
      thoi_diem: new Date(dong_ho()),
      hanh_dong,
      ket_qua,
      tai_khoan,
      may,
      phien_ban_ung_dung,
      chi_tiet: chi_tiet ? che(chi_tiet) : null,
    };
  }
  return Object.freeze({
    /** Ghi và ném lỗi nếu thất bại — dùng khi không có nhật ký thì không được thực hiện hành động. */
    async ghi(thong_tin) {
      await kho.ghi(dung_ban_ghi(thong_tin));
    },
    /** Ghi cố gắng, lỗi chỉ đưa vào log máy chủ — dùng cho sự kiện thất bại/từ chối. */
    async ghi_co_gang(thong_tin) {
      try {
        await kho.ghi(dung_ban_ghi(thong_tin));
      } catch (loi) {
        log.loi('Không ghi được nhật ký', { hanh_dong: thong_tin.hanh_dong, loi });
      }
    },
  });
}

module.exports = { tao_dich_vu_nhat_ky };
