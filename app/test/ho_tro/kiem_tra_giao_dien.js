'use strict';
/**
 * Bộ kiểm tra nhanh giao diện, dùng chung: nhận một hàm `nap(duong_dan)` trả về module (đã biên dịch JSX)
 * và dựng từng màn hình ra HTML bằng react-dom/server.
 * Chỉ phát hiện lỗi dựng cơ bản và nội dung chữ; không thay cho thử bằng tay.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const SSR = require('react-dom/server');

const html = (phan_tu) => SSR.renderToStaticMarkup(phan_tu);
const MUC = [
  { ma: 'thong_tin_co_ban', ten: 'Thông tin cơ bản', nhay_cam: false },
  { ma: 'lien_he', ten: 'Liên hệ', nhay_cam: false },
  { ma: 'nghi_phep', ten: 'Nghỉ phép', nhay_cam: true },
  { ma: 'luong', ten: 'Lương', nhay_cam: true },
];

function chay(nap) {
  test('màn hình cài đặt hiện ô địa chỉ máy chủ', async () => {
    const { ManHinhCaiDat } = await nap('ung_dung/man_hinh_cai_dat.jsx');
    const s = html(React.createElement(ManHinhCaiDat, { dia_chi_hien_tai: '', khi_xong() {}, khi_huy: null }));
    assert.match(s, /Kết nối tới máy chủ/);
    assert.match(s, /Địa chỉ máy chủ/);
    assert.match(s, /Kiểm tra và lưu/);
    assert.doesNotMatch(s, /Hủy/);
  });

  test('màn hình đăng nhập hiện máy chủ, đổi máy chủ và thông báo ban đầu', async () => {
    const { ManHinhDangNhap } = await nap('ung_dung/man_hinh_dang_nhap.jsx');
    const s = html(React.createElement(ManHinhDangNhap, {
      dia_chi_may_chu: 'https://hrm.tieudoantt.local:8443', thong_bao_ban_dau: 'Phiên đăng nhập đã hết hạn.', khi_thanh_cong() {}, khi_doi_may_chu() {},
    }));
    assert.match(s, /Tên đăng nhập/);
    assert.match(s, /type="password"/);
    assert.match(s, /hrm\.tieudoantt\.local:8443/);
    assert.match(s, /Đổi máy chủ/);
    assert.match(s, /Phiên đăng nhập đã hết hạn/);
    assert.doesNotMatch(s, /https:\/\/hrm/);
  });

  test('màn hình cập nhật nêu phiên bản', async () => {
    const { ManHinhCapNhat } = await nap('ung_dung/man_hinh_cap_nhat.jsx');
    const s = html(React.createElement(ManHinhCapNhat, { phien_ban_hien_tai: '0.1.0', phien_ban_toi_thieu: '0.5.0', thong_diep: 'Cũ' }));
    assert.match(s, /Cần cập nhật ứng dụng/);
    assert.match(s, /0\.1\.0/);
    assert.match(s, /0\.5\.0/);
  });

  test('khung ứng dụng: tên người dùng, vai trò, các mục được xem và trang trống', async () => {
    const { KhungUngDung } = await nap('ung_dung/khung_ung_dung.jsx');
    const s = html(React.createElement(KhungUngDung, {
      tai_khoan: { ten_hien_thi: 'Nguyễn Văn An', loai: 'xem_mot_so_muc', muc_duoc_xem: ['thong_tin_co_ban', 'luong'] },
      hang_so: { MUC_QUYEN: MUC }, dia_chi_may_chu: 'https://hrm.tieudoantt.local:8443', phien_ban: '0.1.0', khi_dang_xuat() {},
    }));
    assert.match(s, /Nguyễn Văn An/);
    assert.match(s, />NA</);
    assert.match(s, /Xem một số mục/);
    assert.match(s, /Lương &amp; phúc lợi/);
    assert.doesNotMatch(s, /Nghỉ phép<\/button>/, 'không có mục nghi_phep nên ẩn menu');
    assert.match(s, /Chức năng này sẽ được bổ sung ở các bước sau/);
    assert.match(s, /Đăng xuất/);
    assert.match(s, /Phiên bản 0\.1\.0/);
  });

  test('gốc ứng dụng dựng được ở trạng thái đang tải', async () => {
    const { UngDung } = await nap('ung_dung/ung_dung.jsx');
    assert.match(html(React.createElement(UngDung)), /Đang khởi động/);
  });
}

module.exports = { chay };
