// Khung chính: menu bên trái theo mockup; các mục chưa làm hiển thị trang trống.
import { useState } from 'react';
import { menu_hien_thi, viet_tat_ten, NHAN_LOAI_TAI_KHOAN } from './tien_ich.mjs';

function TrangTrong({ muc_menu }) {
  return (
    <div className="the-trong">
      <h2>{muc_menu.ten}</h2>
      <div>Chức năng này sẽ được bổ sung ở các bước sau.</div>
    </div>
  );
}

export function KhungUngDung({ tai_khoan, hang_so, dia_chi_may_chu, phien_ban, khi_dang_xuat }) {
  const danh_sach_menu = menu_hien_thi(tai_khoan.muc_duoc_xem);
  const [dang_chon, dat_dang_chon] = useState(danh_sach_menu[0].ma);
  const muc_menu = danh_sach_menu.find((m) => m.ma === dang_chon) || danh_sach_menu[0];
  const ten_muc = (ma) => (hang_so.MUC_QUYEN.find((m) => m.ma === ma) || { ten: ma }).ten;

  return (
    <div className="khung">
      <nav className="thanh-ben" aria-label="Menu chính">
        <div className="thuong-hieu">HRM · Quản lý nhân sự</div>
        {danh_sach_menu.map((m) => (
          <button
            key={m.ma}
            type="button"
            className={`menu-muc${m.ma === muc_menu.ma ? ' dang-chon' : ''}`}
            aria-current={m.ma === muc_menu.ma ? 'page' : undefined}
            onClick={() => dat_dang_chon(m.ma)}
          >
            {m.ten}
          </button>
        ))}
        <div className="chan">
          {`Máy chủ: ${String(dia_chi_may_chu || '').replace(/^https:\/\//, '')}`}
          <br />
          {`Phiên bản ${phien_ban}`}
        </div>
      </nav>
      <div className="vung-chinh">
        <header className="thanh-tren">
          <div className="tieu-de">{muc_menu.ten}</div>
          <div className="avatar" aria-hidden="true">{viet_tat_ten(tai_khoan.ten_hien_thi)}</div>
          <div className="nguoi-dung">
            <div className="ten">{tai_khoan.ten_hien_thi}</div>
            <div className="vai-tro">{NHAN_LOAI_TAI_KHOAN[tai_khoan.loai] || tai_khoan.loai}</div>
          </div>
          <button type="button" className="nut vien nho" onClick={khi_dang_xuat}>Đăng xuất</button>
        </header>
        <main className="noi-dung">
          <TrangTrong muc_menu={muc_menu} />
          <div className="danh-sach-chip" aria-label="Các mục được xem">
            {tai_khoan.muc_duoc_xem.map((ma) => <span key={ma} className="chip">{ten_muc(ma)}</span>)}
          </div>
        </main>
      </div>
    </div>
  );
}
