'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MA_LOI } = require('@hrm/shared');
const { tao_moi_truong, them_tai_khoan, thu_dang_nhap, GIOI_HAN } = require('./ho_tro/gia');

const MK = 'MatKhauBiMat-123';
const la = (ma, trang_thai) => (loi) => loi.ma === ma && loi.trang_thai === trang_thai;

test('đăng nhập đúng: trả token, hồ sơ tài khoản, ghi nhật ký thành công', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  const kq = await thu_dang_nhap(dich_vu, 'Admin ', MK); // tên được chuẩn hóa
  assert.match(kq.token, /^token_gia\./);
  assert.equal(kq.tai_khoan.ten_dang_nhap, 'admin');
  assert.equal(kq.tai_khoan.quyen_ghi, true);
  assert.equal(kq.tai_khoan.muc_duoc_xem.length, 11);
  assert.equal('mat_khau_bam' in kq.tai_khoan, false);
  const nk = kho._du_lieu.nhat_ky;
  assert.equal(nk.length, 1);
  assert.equal(nk[0].hanh_dong, 'dang_nhap');
  assert.equal(nk[0].ket_qua, 'thanh_cong');
  assert.equal(nk[0].tai_khoan.ten, 'admin');
  assert.deepEqual(nk[0].may, { ten: 'MAY-01', ip: '192.168.1.21' });
  assert.ok(nk[0].thoi_diem instanceof Date);
});

test('sai mật khẩu và tên không tồn tại cho cùng một lỗi (không lộ tài khoản có thật)', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  const loi_sai_mk = await thu_dang_nhap(dich_vu, 'admin', 'sai').catch((e) => e);
  const loi_khong_co = await thu_dang_nhap(dich_vu, 'khong_co', 'sai').catch((e) => e);
  assert.equal(loi_sai_mk.ma, MA_LOI.SAI_THONG_TIN_DANG_NHAP);
  assert.equal(loi_sai_mk.trang_thai, 401);
  assert.equal(loi_khong_co.ma, loi_sai_mk.ma);
  assert.equal(loi_khong_co.message, loi_sai_mk.message);
});

test('tên không tồn tại vẫn tốn một lần so mật khẩu (thời gian phản hồi như nhau)', async () => {
  const { dich_vu, mat_khau } = tao_moi_truong();
  await thu_dang_nhap(dich_vu, 'khong_co', 'x').catch(() => {});
  assert.equal(mat_khau.dem_so_sanh, 1);
});

test('nhật ký không chứa mật khẩu, token hay tên gõ vào khi tài khoản không tồn tại', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  await thu_dang_nhap(dich_vu, 'admin', MK);
  await thu_dang_nhap(dich_vu, 'admin', 'MatKhauSai-999').catch(() => {});
  await thu_dang_nhap(dich_vu, 'nguoi_la_gõ_nhầm_mật_khẩu', 'MatKhauSai-777').catch(() => {});
  const chuoi = JSON.stringify(kho._du_lieu.nhat_ky);
  for (const bi_cam of [MK, 'MatKhauSai-999', 'MatKhauSai-777', 'token_gia', 'nguoi_la_gõ_nhầm_mật_khẩu', 'bam:']) {
    assert.equal(chuoi.includes(bi_cam), false, `không được có "${bi_cam}"`);
  }
  const la_ten = kho._du_lieu.nhat_ky.find((x) => x.chi_tiet && x.chi_tiet.ly_do === 'khong_ton_tai');
  assert.equal(la_ten.tai_khoan.ten, null);
  assert.match(la_ten.tai_khoan.tham_chieu, /^khong_ton_tai:[0-9a-f]{12}$/);
});

test('đăng nhập sai quá ngưỡng thì bị khóa tạm, kể cả khi mật khẩu đúng; không so mật khẩu khi đang khóa', async () => {
  const { dich_vu, kho, mat_khau } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  for (let i = 0; i < GIOI_HAN.tai_khoan; i += 1) {
    await assert.rejects(thu_dang_nhap(dich_vu, 'admin', 'sai'), la(MA_LOI.SAI_THONG_TIN_DANG_NHAP, 401));
  }
  const so_sanh_truoc = mat_khau.dem_so_sanh;
  const loi = await thu_dang_nhap(dich_vu, 'admin', MK).catch((e) => e);
  assert.equal(loi.ma, MA_LOI.TAM_KHOA);
  assert.equal(loi.trang_thai, 429);
  assert.equal(loi.tieu_de['Retry-After'], '900');
  assert.equal(loi.them.thu_lai_sau_giay, 900);
  assert.equal(mat_khau.dem_so_sanh, so_sanh_truoc, 'không được so mật khẩu khi đang khóa');
  const cuoi = kho._du_lieu.nhat_ky.at(-1);
  assert.equal(cuoi.ket_qua, 'tu_choi');
});

test('hết thời gian khóa thì đăng nhập lại được và bộ đếm được xóa', async () => {
  const { dich_vu, kho, dong_ho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  for (let i = 0; i < GIOI_HAN.tai_khoan; i += 1) await thu_dang_nhap(dich_vu, 'admin', 'sai').catch(() => {});
  await assert.rejects(thu_dang_nhap(dich_vu, 'admin', MK), la(MA_LOI.TAM_KHOA, 429));
  dong_ho.tien(GIOI_HAN.cua_so_ms + 1000);
  await thu_dang_nhap(dich_vu, 'admin', MK);
  assert.equal(kho._du_lieu.luot.filter((x) => x.khoa === 'tk:admin').length, 0);
});

test('khóa theo IP: IP bị khóa không đăng nhập được kể cả tài khoản đúng; IP khác vẫn được', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  for (let i = 0; i < GIOI_HAN.ip; i += 1) await thu_dang_nhap(dich_vu, `u${i}`, 'sai', '192.168.1.99').catch(() => {});
  await assert.rejects(thu_dang_nhap(dich_vu, 'admin', MK, '192.168.1.99'), la(MA_LOI.TAM_KHOA, 429));
  await thu_dang_nhap(dich_vu, 'admin', MK, '192.168.1.21');
});

test('các yêu cầu sai gửi song song không qua mặt được giới hạn', async () => {
  const { dich_vu, kho, mat_khau } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  await Promise.all(Array.from({ length: 12 }, () => thu_dang_nhap(dich_vu, 'admin', 'sai').catch(() => {})));
  assert.ok(mat_khau.dem_so_sanh <= GIOI_HAN.tai_khoan, `đã so ${mat_khau.dem_so_sanh} lần`);
});

test('tài khoản bị vô hiệu hóa không đăng nhập được, thông điệp vẫn chung', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'nghi', MK, { khoa: true });
  const loi = await thu_dang_nhap(dich_vu, 'nghi', MK).catch((e) => e);
  assert.equal(loi.ma, MA_LOI.SAI_THONG_TIN_DANG_NHAP);
  assert.equal(kho._du_lieu.nhat_ky.at(-1).chi_tiet.ly_do, 'tai_khoan_bi_khoa');
});

test('không ghi được nhật ký thì không cấp token khi đăng nhập thành công (đóng khi lỗi)', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  kho._loi_nhat_ky = true;
  await assert.rejects(thu_dang_nhap(dich_vu, 'admin', MK), la(MA_LOI.DICH_VU_KHONG_SAN_SANG, 503));
  // còn đăng nhập sai thì vẫn trả lỗi bình thường dù nhật ký hỏng
  await assert.rejects(thu_dang_nhap(dich_vu, 'admin', 'sai'), la(MA_LOI.SAI_THONG_TIN_DANG_NHAP, 401));
});

test('thành công không xóa bộ đếm IP của các lần sai trước đó từ cùng IP', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  await thu_dang_nhap(dich_vu, 'ke_la_1', 'x').catch(() => {});
  await thu_dang_nhap(dich_vu, 'ke_la_2', 'x').catch(() => {});
  await thu_dang_nhap(dich_vu, 'admin', MK);
  assert.equal(kho._du_lieu.luot.filter((x) => x.khoa === 'ip:192.168.1.21').length, 2);
});

test('so_lan_sai tăng khi sai mật khẩu, về 0 khi đăng nhập đúng, ghi dang_nhap_cuoi', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  const tk = await them_tai_khoan(kho, 'admin', MK);
  await thu_dang_nhap(dich_vu, 'admin', 'sai').catch(() => {});
  await thu_dang_nhap(dich_vu, 'admin', 'sai').catch(() => {});
  assert.equal(tk.so_lan_sai, 2);
  assert.ok(tk.lan_sai_cuoi instanceof Date);
  const kq = await thu_dang_nhap(dich_vu, 'admin', MK);
  assert.equal(tk.so_lan_sai, 0);
  assert.ok(tk.dang_nhap_cuoi instanceof Date);
  assert.equal(kq.tai_khoan.buoc_doi_mat_khau, false);
});

test('tên không tồn tại và tài khoản bị khóa (mật khẩu đúng) không làm tăng so_lan_sai', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  const tk = await them_tai_khoan(kho, 'nghi', MK, { khoa: true });
  await thu_dang_nhap(dich_vu, 'nghi', MK).catch(() => {});
  await thu_dang_nhap(dich_vu, 'khong_co', 'x').catch(() => {});
  assert.equal(tk.so_lan_sai, 0);
});

test('lỗi khi cập nhật bộ đếm không làm hỏng đăng nhập; được ghi vào log máy chủ', async () => {
  const { dich_vu, kho, log_loi } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', MK);
  kho._loi_bo_dem = true;
  await thu_dang_nhap(dich_vu, 'admin', 'sai').catch(() => {});
  const kq = await thu_dang_nhap(dich_vu, 'admin', MK);
  assert.ok(kq.token);
  assert.ok(log_loi.length >= 2);
});

test('buoc_doi_mat_khau được chuyển ra giao diện qua hồ sơ tài khoản', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'moi', MK, { loai: 'xem_day_du', buoc_doi_mat_khau: true });
  const kq = await thu_dang_nhap(dich_vu, 'moi', MK);
  assert.equal(kq.tai_khoan.buoc_doi_mat_khau, true);
  assert.equal(kq.tai_khoan.quyen_ghi, false);
});
