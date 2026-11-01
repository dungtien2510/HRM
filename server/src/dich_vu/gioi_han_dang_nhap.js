"use strict";
/**
 * Giới hạn đăng nhập sai theo tài khoản VÀ theo IP, khóa tạm.
 *
 * Cách làm "giữ chỗ": mỗi lần thử, TRƯỚC khi kiểm tra mật khẩu, ghi một lượt vào kho rồi đếm số lượt
 * trong cửa sổ thời gian (kể cả lượt này). Nếu đếm > ngưỡng → chặn và rút lượt này lại (lượt bị chặn
 * không kéo dài thời gian khóa). Vì lượt được ghi trước khi đếm nên các yêu cầu gửi song song
 * cũng không vượt được ngưỡng. Đăng nhập thành công xóa lượt của tài khoản đó và lượt IP của chính lần đó.
 * Khóa theo tên đăng nhập áp dụng cả với tên không tồn tại → không dò được tài khoản nào có thật.
 */
function tao_gioi_han({
  kho,
  dong_ho = Date.now,
  sai_toi_da_tai_khoan,
  sai_toi_da_ip,
  cua_so_ms,
}) {
  async function giu_cho(khoa, nguong) {
    const bay_gio = dong_ho();
    const id = await kho.them({
      khoa,
      luc: new Date(bay_gio),
      het_han: new Date(bay_gio + cua_so_ms),
    });
    const ds = await kho.liet_ke(khoa, new Date(bay_gio - cua_so_ms)); // tăng dần theo thời gian
    if (ds.length <= nguong) return { id, bi_khoa: false, thu_lai_sau_ms: 0 };

    await kho.xoa_theo_id([id]);
    // Cần có (ds.length - nguong) lượt cũ nhất hết hạn thì mới được thử lại.
    const so_can_het_han = Math.min(ds.length - nguong, ds.length);
    const luc_duoc_thu_lai = ds[so_can_het_han - 1].luc.getTime() + cua_so_ms;
    return {
      id: null,
      bi_khoa: true,
      thu_lai_sau_ms: Math.max(1000, luc_duoc_thu_lai - bay_gio),
    };
  }

  /** ten: tên đăng nhập đã chuẩn hóa; ip: địa chỉ đã chuẩn hóa. */
  /** async function giu_cho_dang_nhap({ ten, ip }) {
    const tk = await giu_cho(`tk:${ten}`, sai_toi_da_tai_khoan);
    let theo_ip;
    try {
      theo_ip = await giu_cho(`ip:${ip}`, sai_toi_da_ip);
    } catch (loi) {
      if (tk.id) await kho.xoa_theo_id([tk.id]);
      throw loi;
    }
    if (tk.bi_khoa || theo_ip.bi_khoa) {
      await kho.xoa_theo_id([tk.id, theo_ip.id].filter(Boolean));
      const ms = Math.max(tk.thu_lai_sau_ms, theo_ip.thu_lai_sau_ms);
      return { bi_khoa: true, thu_lai_sau_giay: Math.ceil(ms / 1000), luot: null };
    }
    return { bi_khoa: false, thu_lai_sau_giay: 0, luot: { ten, id_ip: theo_ip.id } };
  }

  async function ghi_nhan_thanh_cong(luot) {
    await kho.xoa_theo_khoa(`tk:${luot.ten}`);
    await kho.xoa_theo_id([luot.id_ip]);
  }*/
  async function giu_cho_dang_nhap({ ten, ip }) {
    // 3 lớp: (tên + IP) ngưỡng thường; IP ngưỡng thường; tên (mọi IP) ngưỡng rộng gấp 6 để chặn tấn công phân tán.
    const khoa_tk_ip = `tk:${ten}|${ip}`;
    const khoa_tk_rong = `tkr:${ten}`;
    const da_giu = [];
    let ket_qua;
    try {
      const tk_ip = await giu_cho(khoa_tk_ip, sai_toi_da_tai_khoan);
      da_giu.push(tk_ip);
      const theo_ip = await giu_cho(`ip:${ip}`, sai_toi_da_ip);
      da_giu.push(theo_ip);
      const tk_rong = await giu_cho(khoa_tk_rong, sai_toi_da_tai_khoan * 6);
      da_giu.push(tk_rong);
      ket_qua = { tk_ip, theo_ip, tk_rong };
    } catch (loi) {
      await kho.xoa_theo_id(da_giu.map((x) => x.id).filter(Boolean));
      throw loi;
    }
    const { tk_ip, theo_ip, tk_rong } = ket_qua;
    if (tk_ip.bi_khoa || theo_ip.bi_khoa || tk_rong.bi_khoa) {
      await kho.xoa_theo_id(da_giu.map((x) => x.id).filter(Boolean));
      const ms = Math.max(
        tk_ip.thu_lai_sau_ms,
        theo_ip.thu_lai_sau_ms,
        tk_rong.thu_lai_sau_ms,
      );
      return {
        bi_khoa: true,
        thu_lai_sau_giay: Math.ceil(ms / 1000),
        luot: null,
      };
    }
    return {
      bi_khoa: false,
      thu_lai_sau_giay: 0,
      luot: { ten, ip, id_ip: theo_ip.id, id_rong: tk_rong.id },
    };
  }

  async function ghi_nhan_thanh_cong(luot) {
    await kho.xoa_theo_khoa(`tk:${luot.ten}|${luot.ip}`);
    await kho.xoa_theo_id([luot.id_ip, luot.id_rong].filter(Boolean));
  }

  return Object.freeze({ giu_cho_dang_nhap, ghi_nhan_thanh_cong });
}

module.exports = { tao_gioi_han };
