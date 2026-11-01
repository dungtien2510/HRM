'use strict';
// Hàm thuần của giao diện là module ESM (.mjs) → nạp bằng import() động từ file test CommonJS.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const nap = () => import(pathToFileURL(path.join(__dirname, '..', 'src', 'renderer', 'ung_dung', 'tien_ich.mjs')).href);

test('viet_tat_ten: chữ cái đầu của họ và tên', async () => {
  const { viet_tat_ten } = await nap();
  assert.equal(viet_tat_ten('Nguyễn Văn An'), 'NA');
  assert.equal(viet_tat_ten('  Quản trị  '), 'QT');
  assert.equal(viet_tat_ten('Admin'), 'A');
  assert.equal(viet_tat_ten('đặng thị lan'), 'ĐL', 'viết hoa đúng với chữ có dấu');
  assert.equal(viet_tat_ten(''), '?');
  assert.equal(viet_tat_ten(null), '?');
});

test('dinh_dang_thoi_gian', async () => {
  const { dinh_dang_thoi_gian } = await nap();
  assert.equal(dinh_dang_thoi_gian(125), '2 phút 5 giây');
  assert.equal(dinh_dang_thoi_gian(900), '15 phút');
  assert.equal(dinh_dang_thoi_gian(59), '59 giây');
  assert.equal(dinh_dang_thoi_gian(0.2), '1 giây');
  assert.equal(dinh_dang_thoi_gian(-5), '0 giây');
});

test('menu theo mockup: 6 mục; mục theo quyền bị ẩn nếu tài khoản không có mục tương ứng', async () => {
  const { menu_hien_thi, MENU } = await nap();
  assert.equal(MENU.length, 6);
  assert.deepEqual(menu_hien_thi(['thong_tin_co_ban', 'nghi_phep', 'luong']).map((m) => m.ten),
    ['Tổng quan', 'Hồ sơ nhân sự', 'Chấm công', 'Nghỉ phép', 'Lương & phúc lợi', 'Báo cáo & xuất file']);
  assert.deepEqual(menu_hien_thi(['thong_tin_co_ban']).map((m) => m.ten),
    ['Tổng quan', 'Hồ sơ nhân sự', 'Chấm công', 'Báo cáo & xuất file']);
  assert.deepEqual(menu_hien_thi(undefined).map((m) => m.ma), ['tong_quan', 'cham_cong', 'bao_cao']);
});

test('nhãn loại tài khoản đủ ba loại', async () => {
  const { NHAN_LOAI_TAI_KHOAN } = await nap();
  assert.deepEqual(Object.keys(NHAN_LOAI_TAI_KHOAN).sort(), ['admin', 'xem_day_du', 'xem_mot_so_muc']);
});
