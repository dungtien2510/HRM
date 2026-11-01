// Hiện khi máy chủ trả 426: phiên bản ứng dụng thấp hơn mức tối thiểu.
import { ThuongHieu } from './thanh_phan.jsx';

export function ManHinhCapNhat({ phien_ban_hien_tai, phien_ban_toi_thieu, thong_diep }) {
  return (
    <div className="man-doc-lap">
      <div className="the">
        <ThuongHieu />
        <h1>Cần cập nhật ứng dụng</h1>
        <p className="phu-de">{thong_diep || 'Phiên bản ứng dụng trên máy này đã cũ so với máy chủ.'}</p>
        <div className="thong-bao canh-bao" role="status">
          {`Phiên bản đang dùng: ${phien_ban_hien_tai || '?'}`}
          {phien_ban_toi_thieu ? <span className="goi-y">{`Phiên bản tối thiểu máy chủ yêu cầu: ${phien_ban_toi_thieu}`}</span> : null}
        </div>
        <p className="phu-de">Vui lòng liên hệ quản trị viên để cài bản mới, rồi mở lại ứng dụng. (Tự động cập nhật sẽ được bổ sung ở bước sau.)</p>
      </div>
    </div>
  );
}
