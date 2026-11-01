// Gốc ứng dụng: máy trạng thái dang_tai → cai_dat → dang_nhap → khung (hoặc cap_nhat).
import { useState, useEffect } from 'react';
import { ManHinhCaiDat } from './man_hinh_cai_dat.jsx';
import { ManHinhDangNhap } from './man_hinh_dang_nhap.jsx';
import { ManHinhCapNhat } from './man_hinh_cap_nhat.jsx';
import { KhungUngDung } from './khung_ung_dung.jsx';

function BannerKetNoi({ ket_noi, khi_thu_lai, dang_thu }) {
  if (!ket_noi || ket_noi.trang_thai === 'ket_noi_tot' || ket_noi.trang_thai === 'chua_ro') return null;
  const su_co = ket_noi.trang_thai === 'may_chu_gap_su_co';
  return (
    <div className={`banner ${su_co ? 'su-co' : 'mat-ket-noi'}`} role="alert">
      <strong>{su_co ? 'Máy chủ đang gặp sự cố.' : 'Mất kết nối máy chủ.'}</strong>
      <span className="goi-y">{[ket_noi.thong_diep, ket_noi.goi_y].filter(Boolean).join(' ')}</span>
      <button type="button" className="nut vien nho" onClick={khi_thu_lai} disabled={dang_thu}>
        {dang_thu ? 'Đang thử…' : 'Thử lại ngay'}
      </button>
    </div>
  );
}

export function UngDung() {
  const [man_hinh, dat_man_hinh] = useState('dang_tai');
  const [hang_so, dat_hang_so] = useState(null);
  const [phien_ban, dat_phien_ban] = useState('');
  const [dia_chi, dat_dia_chi] = useState(null);
  const [tai_khoan, dat_tai_khoan] = useState(null);
  const [thong_bao, dat_thong_bao] = useState(null);
  const [cap_nhat, dat_cap_nhat] = useState(null);
  const [ket_noi, dat_ket_noi] = useState(null);
  const [dang_thu, dat_dang_thu] = useState(false);

  useEffect(() => {
    const huy = [
      window.hrm.dang_ky_su_kien('ket_noi', dat_ket_noi),
      window.hrm.dang_ky_su_kien('phien_het_han', (g) => {
        dat_tai_khoan(null);
        dat_thong_bao(g.thong_diep);
        dat_man_hinh('dang_nhap');
      }),
      window.hrm.dang_ky_su_kien('can_cap_nhat', (g) => {
        dat_cap_nhat(g);
        dat_man_hinh('cap_nhat');
      }),
    ];
    (async () => {
      const [hs, pb, cau_hinh] = await Promise.all([
        window.hrm.lay_hang_so(), window.hrm.phien_ban_ung_dung(), window.hrm.cau_hinh_may(),
      ]);
      dat_hang_so(hs);
      dat_phien_ban(pb);
      dat_dia_chi(cau_hinh.dia_chi_may_chu);
      if (!cau_hinh.dia_chi_may_chu) { dat_man_hinh('cai_dat'); return; }
      const toi = await window.hrm.toi_la_ai(); // còn phiên trong main (vd khi tải lại cửa sổ)
      if (toi.ok) { dat_tai_khoan(toi.du_lieu.tai_khoan); dat_man_hinh('khung'); } else dat_man_hinh('dang_nhap');
    })();
    return () => huy.forEach((f) => f());
  }, []);

  async function thu_lai() {
    dat_dang_thu(true);
    await window.hrm.thu_lai_ket_noi();
    dat_dang_thu(false);
  }

  async function dang_xuat() {
    await window.hrm.dang_xuat();
    dat_tai_khoan(null);
    dat_thong_bao(null);
    dat_man_hinh('dang_nhap');
  }

  async function sau_khi_luu_may_chu() {
    const c = await window.hrm.cau_hinh_may();
    dat_dia_chi(c.dia_chi_may_chu);
    dat_thong_bao(null);
    dat_man_hinh('dang_nhap');
  }

  let noi_dung;
  switch (man_hinh) {
    case 'cai_dat':
      noi_dung = (
        <ManHinhCaiDat
          dia_chi_hien_tai={dia_chi ? dia_chi.replace(/^https:\/\//, '') : ''}
          khi_xong={sau_khi_luu_may_chu}
          khi_huy={dia_chi ? () => dat_man_hinh('dang_nhap') : null}
        />
      );
      break;
    case 'dang_nhap':
      noi_dung = (
        <ManHinhDangNhap
          dia_chi_may_chu={dia_chi}
          thong_bao_ban_dau={thong_bao}
          khi_thanh_cong={(tk) => { dat_tai_khoan(tk); dat_thong_bao(null); dat_man_hinh('khung'); }}
          khi_doi_may_chu={() => dat_man_hinh('cai_dat')}
        />
      );
      break;
    case 'khung':
      noi_dung = <KhungUngDung tai_khoan={tai_khoan} hang_so={hang_so} dia_chi_may_chu={dia_chi} phien_ban={phien_ban} khi_dang_xuat={dang_xuat} />;
      break;
    case 'cap_nhat':
      noi_dung = (
        <ManHinhCapNhat
          phien_ban_hien_tai={phien_ban}
          phien_ban_toi_thieu={cap_nhat && cap_nhat.phien_ban_toi_thieu}
          thong_diep={cap_nhat && cap_nhat.thong_diep}
        />
      );
      break;
    default:
      noi_dung = <div className="dang-tai">Đang khởi động…</div>;
  }

  const hien_banner = dia_chi && man_hinh !== 'cai_dat' && man_hinh !== 'dang_tai';
  return (
    <>
      {hien_banner ? <BannerKetNoi ket_noi={ket_noi} khi_thu_lai={thu_lai} dang_thu={dang_thu} /> : null}
      {noi_dung}
    </>
  );
}
