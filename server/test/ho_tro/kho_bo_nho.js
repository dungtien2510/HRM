'use strict';
/** Kho dữ liệu trong bộ nhớ có cùng giao diện với src/kho/mongo.js — chỉ dùng cho kiểm thử. */
function tao_kho_bo_nho() {
  const nguoi_dung = [];
  const luot = [];
  const nhat_ky = [];
  const cau_hinh = new Map();
  let dem_tk = 0;
  let dem_luot = 0;

  const kho = {
    _loi_nhat_ky: false, // bật để giả lập hỏng ổ ghi nhật ký
    _loi_bo_dem: false,  // bật để giả lập lỗi khi cập nhật bộ đếm so_lan_sai
    _du_lieu: { nguoi_dung, luot, nhat_ky, cau_hinh },
    nguoi_dung: {
      async tim_theo_ten(ten) { return nguoi_dung.find((x) => x.ten_dang_nhap === ten) ?? null; },
      async tim_theo_id(id) { return nguoi_dung.find((x) => String(x._id) === id) ?? null; },
      async tao(doc) {
        if (nguoi_dung.some((x) => x.ten_dang_nhap === doc.ten_dang_nhap)) throw new Error('trùng tên đăng nhập');
        dem_tk += 1;
        const moi = { ...doc, _id: dem_tk.toString(16).padStart(24, '0') };
        nguoi_dung.push(moi);
        return moi;
      },
      async dem_theo_loai(loai) { return nguoi_dung.filter((x) => x.loai === loai).length; },
      async ghi_nhan_dang_nhap_sai(id) {
        if (kho._loi_bo_dem) throw new Error('lỗi giả lập bộ đếm');
        const tk = nguoi_dung.find((x) => String(x._id) === id);
        if (tk) { tk.so_lan_sai = (tk.so_lan_sai || 0) + 1; tk.lan_sai_cuoi = new Date(); }
      },
      async ghi_nhan_dang_nhap_dung(id) {
        if (kho._loi_bo_dem) throw new Error('lỗi giả lập bộ đếm');
        const tk = nguoi_dung.find((x) => String(x._id) === id);
        if (tk) { tk.so_lan_sai = 0; tk.dang_nhap_cuoi = new Date(); }
      },
    },
    luot_dang_nhap: {
      async them({ khoa, luc, het_han }) {
        dem_luot += 1;
        const id = `l${dem_luot}`;
        luot.push({ _id: id, khoa, luc, het_han });
        return id;
      },
      async liet_ke(khoa, tu_luc) {
        return luot
          .filter((x) => x.khoa === khoa && x.luc.getTime() > tu_luc.getTime())
          .sort((a, b) => a.luc - b.luc || a._id.localeCompare(b._id))
          .map((x) => ({ id: x._id, luc: x.luc }));
      },
      async xoa_theo_id(ids) {
        for (const id of ids || []) {
          const vt = luot.findIndex((x) => x._id === id);
          if (vt >= 0) luot.splice(vt, 1);
        }
      },
      async xoa_theo_khoa(khoa) {
        for (let i = luot.length - 1; i >= 0; i -= 1) if (luot[i].khoa === khoa) luot.splice(i, 1);
      },
    },
    nhat_ky: {
      async ghi(doc) {
        if (kho._loi_nhat_ky) throw new Error('lỗi giả lập khi ghi nhật ký');
        nhat_ky.push(structuredClone(doc));
      },
    },
    cau_hinh: {
      async lay(ma) { return cau_hinh.get(ma) ?? null; },
      async dat_neu_chua_co(ma, gia_tri) { if (!cau_hinh.has(ma)) cau_hinh.set(ma, { _id: ma, ...gia_tri }); },
    },
  };
  return kho;
}

module.exports = { tao_kho_bo_nho };
