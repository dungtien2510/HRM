// Màn hình đăng nhập.
import { useState, useEffect } from 'react';
import { OTruong, ThongBao, ThuongHieu } from './thanh_phan.jsx';
import { dinh_dang_thoi_gian } from './tien_ich.mjs';

export function ManHinhDangNhap({ dia_chi_may_chu, thong_bao_ban_dau, khi_thanh_cong, khi_doi_may_chu }) {
  const [ten, dat_ten] = useState('');
  const [mat_khau, dat_mat_khau] = useState('');
  const [dang_gui, dat_dang_gui] = useState(false);
  const [loi, dat_loi] = useState(null);
  const [con_khoa_giay, dat_con_khoa_giay] = useState(0);

  // Đếm ngược khi tài khoản/IP bị khóa tạm.
  useEffect(() => {
    if (con_khoa_giay <= 0) return undefined;
    const dong_ho = setTimeout(() => dat_con_khoa_giay((g) => g - 1), 1000);
    return () => clearTimeout(dong_ho);
  }, [con_khoa_giay]);

  async function gui(su_kien) {
    su_kien.preventDefault();
    dat_dang_gui(true);
    dat_loi(null);
    const kq = await window.hrm.dang_nhap(ten, mat_khau);
    dat_dang_gui(false);
    dat_mat_khau('');
    if (kq.ok) {
      khi_thanh_cong(kq.du_lieu.tai_khoan);
      return;
    }
    if (kq.ma === 'TAM_KHOA' && Number.isFinite(kq.thu_lai_sau_giay)) dat_con_khoa_giay(kq.thu_lai_sau_giay);
    if (kq.ma === 'CAN_CAP_NHAT' || kq.ma === 'THIEU_PHIEN_BAN') return; // màn hình cập nhật tự hiện qua sự kiện
    dat_loi(kq);
  }

  const bi_khoa = con_khoa_giay > 0;
  const chi_tiet = loi && Array.isArray(loi.chi_tiet) ? loi.chi_tiet.map((c) => c.thong_diep) : null;

  return (
    <div className="man-doc-lap">
      <form className="the" onSubmit={gui} noValidate>
        <ThuongHieu />
        <h1>Đăng nhập</h1>
        <p className="phu-de">Dùng tài khoản do quản trị viên cấp.</p>
        {thong_bao_ban_dau ? <ThongBao loai="canh-bao" thong_diep={thong_bao_ban_dau} /> : null}
        <OTruong id="ten_dang_nhap" nhan="Tên đăng nhập" gia_tri={ten} khi_doi={dat_ten} tu_lay_net tu_hoan_thanh="username" bi_vo_hieu={dang_gui} toi_da={64} />
        <OTruong id="mat_khau" nhan="Mật khẩu" loai="password" gia_tri={mat_khau} khi_doi={dat_mat_khau} tu_hoan_thanh="current-password" bi_vo_hieu={dang_gui} toi_da={72} />
        {bi_khoa
          ? <ThongBao loai="loi" thong_diep={`Đăng nhập sai quá nhiều lần. Thử lại sau ${dinh_dang_thoi_gian(con_khoa_giay)}.`} />
          : <ThongBao loai="loi" thong_diep={loi && loi.thong_diep} goi_y={loi && loi.goi_y} danh_sach={chi_tiet} />}
        <button type="submit" className="nut" disabled={dang_gui || bi_khoa || ten.trim() === '' || mat_khau === ''}>
          {dang_gui ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <div className="chan-the">
          <span>{`Máy chủ: ${String(dia_chi_may_chu || '').replace(/^https:\/\//, '')}`}</span>
          <button type="button" className="nut lien-ket" onClick={khi_doi_may_chu} disabled={dang_gui}>Đổi máy chủ</button>
        </div>
      </form>
    </div>
  );
}
