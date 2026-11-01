'use strict';
const { phan_tich_phien_ban } = require('@hrm/shared');

/** Đọc phiên bản tối thiểu từ collection cau_hinh (_id: 'he_thong'), nhớ đệm ngắn để đỡ tốn truy vấn. */
function tao_kiem_tra_phien_ban({ kho_cau_hinh, mac_dinh, dong_ho = Date.now, nho_dem_ms = 30000 }) {
  let gia_tri = null;
  let het_han = 0;
  async function phien_ban_toi_thieu() {
    const bay_gio = dong_ho();
    if (gia_tri && bay_gio < het_han) return gia_tri;
    try {
      const doc = await kho_cau_hinh.lay('he_thong');
      gia_tri = doc && phan_tich_phien_ban(doc.phien_ban_toi_thieu) ? doc.phien_ban_toi_thieu : mac_dinh;
      het_han = bay_gio + nho_dem_ms;
    } catch (loi) {
      if (!gia_tri) throw loi; // chưa có giá trị nào để dùng tạm
    }
    return gia_tri;
  }
  return Object.freeze({ phien_ban_toi_thieu, xoa_nho_dem() { gia_tri = null; het_han = 0; } });
}

module.exports = { tao_kiem_tra_phien_ban };
