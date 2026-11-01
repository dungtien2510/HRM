// Màn hình nhập địa chỉ máy chủ (lần chạy đầu hoặc khi đổi máy chủ).
import { useState } from 'react';
import { OTruong, ThongBao, ThuongHieu } from './thanh_phan.jsx';

export function ManHinhCaiDat({ dia_chi_hien_tai, khi_xong, khi_huy }) {
  const [dia_chi, dat_dia_chi] = useState(dia_chi_hien_tai || '');
  const [dang_kiem_tra, dat_dang_kiem_tra] = useState(false);
  const [ket_qua, dat_ket_qua] = useState(null);

  async function gui(su_kien) {
    su_kien.preventDefault();
    dat_dang_kiem_tra(true);
    dat_ket_qua(null);
    const kq = await window.hrm.kiem_tra_va_luu_may_chu(dia_chi);
    dat_dang_kiem_tra(false);
    dat_ket_qua(kq);
  }

  const thanh_cong = Boolean(ket_qua && ket_qua.ok);
  return (
    <div className="man-doc-lap">
      <form className="the" onSubmit={gui} noValidate>
        <ThuongHieu />
        <h1>Kết nối tới máy chủ</h1>
        <p className="phu-de">Nhập địa chỉ máy chủ HRM của đơn vị. Ứng dụng sẽ kiểm tra kết nối và chứng chỉ bảo mật trước khi lưu.</p>
        <OTruong
          id="dia_chi_may_chu"
          nhan="Địa chỉ máy chủ"
          gia_tri={dia_chi}
          khi_doi={dat_dia_chi}
          tu_lay_net
          ghi_chu="Ví dụ: hrm.tieudoantt.local (cổng mặc định 8443)"
          bi_vo_hieu={dang_kiem_tra}
          toi_da={300}
        />
        {thanh_cong
          ? <ThongBao loai="tot" thong_diep={ket_qua.thong_diep} />
          : <ThongBao loai="loi" thong_diep={ket_qua && ket_qua.thong_diep} goi_y={ket_qua && ket_qua.goi_y} />}
        <div className="hang-nut">
          {thanh_cong
            ? <button type="button" className="nut" onClick={khi_xong}>Tiếp tục</button>
            : (
              <button type="submit" className="nut" disabled={dang_kiem_tra || dia_chi.trim() === ''}>
                {dang_kiem_tra ? 'Đang kiểm tra…' : 'Kiểm tra và lưu'}
              </button>
            )}
          {khi_huy ? <button type="button" className="nut vien" onClick={khi_huy} disabled={dang_kiem_tra}>Hủy</button> : null}
        </div>
      </form>
    </div>
  );
}
