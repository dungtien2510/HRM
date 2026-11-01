// Thành phần giao diện nhỏ dùng chung.

/** Ô nhập có nhãn. */
export function OTruong({ id, nhan, loai = 'text', gia_tri, khi_doi, ghi_chu, tu_lay_net = false, tu_hoan_thanh, bi_vo_hieu = false, toi_da }) {
  return (
    <div className="truong">
      <label htmlFor={id}>{nhan}</label>
      <input
        id={id}
        type={loai}
        value={gia_tri}
        autoFocus={tu_lay_net}
        disabled={bi_vo_hieu}
        maxLength={toi_da}
        autoComplete={tu_hoan_thanh || 'off'}
        spellCheck={false}
        onChange={(e) => khi_doi(e.target.value)}
      />
      {ghi_chu ? <div className="ghi-chu">{ghi_chu}</div> : null}
    </div>
  );
}

/** Hộp thông báo; loai: loi | tot | canh-bao. */
export function ThongBao({ loai = 'loi', thong_diep, goi_y, danh_sach }) {
  if (!thong_diep) return null;
  return (
    <div className={`thong-bao ${loai}`} role={loai === 'loi' ? 'alert' : 'status'}>
      {thong_diep}
      {goi_y ? <span className="goi-y">{goi_y}</span> : null}
      {danh_sach && danh_sach.length ? <ul>{danh_sach.map((d, i) => <li key={i}>{d}</li>)}</ul> : null}
    </div>
  );
}

export function ThuongHieu() {
  return <div className="thuong-hieu">HRM · Quản lý nhân sự</div>;
}
