'use strict';
// Kiểm thử HTTP đầy đủ: Express + bcrypt + jsonwebtoken thật, kho dữ liệu bộ nhớ. Cần đã chạy `npm install`.
// (TLS không được kiểm ở đây; phần "chỉ HTTPS" kiểm bằng cách thử tay, xem docs/03_kiem_thu.md.)
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { tao_ung_dung } = require('../src/ung_dung');
const { tao_dich_vu_mat_khau } = require('../src/dich_vu/mat_khau');
const { tao_dich_vu_token } = require('../src/dich_vu/token');
const { tao_gioi_han } = require('../src/dich_vu/gioi_han_dang_nhap');
const { tao_dich_vu_nhat_ky } = require('../src/dich_vu/nhat_ky');
const { tao_kiem_tra_phien_ban } = require('../src/dich_vu/phien_ban');
const { tao_dich_vu_dang_nhap } = require('../src/dich_vu/dang_nhap');
const { tao_kho_bo_nho } = require('./ho_tro/kho_bo_nho');
const { tao_dong_ho_gia, GIOI_HAN } = require('./ho_tro/gia');

const BI_MAT = 'k'.repeat(64);
const MK = 'MatKhauBiMat-123';

async function khoi_dong() {
  const dong_ho = tao_dong_ho_gia();
  const kho = tao_kho_bo_nho();
  await kho.cau_hinh.dat_neu_chua_co('he_thong', { phien_ban_toi_thieu: '0.1.0' });
  const log_loi = [];
  const log = { thong_tin() {}, canh_bao() {}, loi: (t, m) => log_loi.push({ t, m }) };
  const mat_khau = tao_dich_vu_mat_khau({ cost: 4 });
  const token = tao_dich_vu_token({ bi_mat: BI_MAT, het_han_phut: 30, issuer: 'hrm-api', audience: 'hrm-app', dong_ho: dong_ho.now });
  const gioi_han = tao_gioi_han({
    kho: kho.luot_dang_nhap, dong_ho: dong_ho.now,
    sai_toi_da_tai_khoan: GIOI_HAN.tai_khoan, sai_toi_da_ip: GIOI_HAN.ip, cua_so_ms: GIOI_HAN.cua_so_ms,
  });
  const nhat_ky = tao_dich_vu_nhat_ky({ kho: kho.nhat_ky, log, dong_ho: dong_ho.now });
  const kiem_tra_phien_ban = tao_kiem_tra_phien_ban({ kho_cau_hinh: kho.cau_hinh, mac_dinh: '0.1.0', dong_ho: dong_ho.now, nho_dem_ms: 0 });
  const dich_vu_dang_nhap = tao_dich_vu_dang_nhap({
    kho_nguoi_dung: kho.nguoi_dung, gioi_han, nhat_ky, mat_khau, token, bi_mat_tham_chieu: BI_MAT, log,
  });
  const trang_thai_csdl = { ok: true };
  const app = tao_ung_dung({
    log, kho, token, kiem_tra_phien_ban, dich_vu_dang_nhap, dong_ho: dong_ho.now,
    kiem_tra_csdl: async () => trang_thai_csdl.ok,
    them_tuyen: (a) => { a.get('/__loi', () => { throw new Error('chi tiết nội bộ abc123'); }); },
  });
  const may_chu = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
  const cong = may_chu.address().port;

  async function goi(duong_dan, { phuong_thuc = 'GET', tieu_de = {}, du_lieu, tho, phien_ban = '0.1.0' } = {}) {
    const headers = { ...(phien_ban ? { 'x-hrm-app-version': phien_ban } : {}), ...tieu_de };
    let body;
    if (tho !== undefined) { body = tho; headers['content-type'] = 'application/json'; }
    else if (du_lieu !== undefined) { body = JSON.stringify(du_lieu); headers['content-type'] = 'application/json'; }
    const res = await fetch(`http://127.0.0.1:${cong}${duong_dan}`, { method: phuong_thuc, headers, body });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* không phải JSON */ }
    return { trang_thai: res.status, tieu_de: res.headers, json, text };
  }
  const dang_nhap = (ten = 'admin', mk = MK) => goi('/auth/login', { phuong_thuc: 'POST', du_lieu: { ten_dang_nhap: ten, mat_khau: mk } });
  await kho.nguoi_dung.tao({
    ten_dang_nhap: 'admin', ten_hien_thi: 'Quản trị', mat_khau_bam: await mat_khau.bam(MK), loai: 'admin',
    muc_duoc_xem: [], khoa: false, buoc_doi_mat_khau: false, so_lan_sai: 0, so_phien_token: 1,
  });
  await kho.nguoi_dung.tao({
    ten_dang_nhap: 'xem', ten_hien_thi: 'Xem một số mục', mat_khau_bam: await mat_khau.bam(MK), loai: 'xem_mot_so_muc',
    muc_duoc_xem: ['luong'], khoa: false, buoc_doi_mat_khau: true, so_lan_sai: 0, so_phien_token: 1,
  });
  return { goi, dang_nhap, kho, dong_ho, log_loi, trang_thai_csdl, dong: () => new Promise((ok) => may_chu.close(ok)) };
}

test('/health: không cần phiên bản; 503 khi CSDL hỏng; có header an toàn, không có X-Powered-By', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const ok = await m.goi('/health', { phien_ban: null });
  assert.equal(ok.trang_thai, 200);
  assert.equal(ok.json.trang_thai, 'ok');
  assert.equal(ok.tieu_de.get('x-powered-by'), null);
  assert.equal(ok.tieu_de.get('x-content-type-options'), 'nosniff');
  assert.equal(ok.tieu_de.get('cache-control'), 'no-store');
  assert.match(ok.tieu_de.get('strict-transport-security'), /max-age/);
  m.trang_thai_csdl.ok = false;
  const hong = await m.goi('/health', { phien_ban: null });
  assert.equal(hong.trang_thai, 503);
  assert.equal(hong.json.trang_thai, 'loi');
});

test('kiểm tra phiên bản: thiếu/sai → 426; thấp hơn tối thiểu → 426 kèm phiên bản tối thiểu; đủ → qua', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const thieu = await m.goi('/auth/me', { phien_ban: null });
  assert.equal(thieu.trang_thai, 426);
  assert.equal(thieu.json.loi.ma, 'THIEU_PHIEN_BAN');
  const sai_dang = await m.goi('/auth/me', { phien_ban: 'abc' });
  assert.equal(sai_dang.trang_thai, 426);
  const thap = await m.goi('/auth/me', { phien_ban: '0.0.9' });
  assert.equal(thap.trang_thai, 426);
  assert.equal(thap.json.loi.ma, 'CAN_CAP_NHAT');
  assert.equal(thap.json.loi.phien_ban_toi_thieu, '0.1.0');
  const du = await m.goi('/auth/me', { phien_ban: '0.1.0' });
  assert.equal(du.trang_thai, 401, 'qua cổng phiên bản, dừng ở bước xác thực');
  const moi = await m.goi('/auth/me', { phien_ban: '0.10.0' });
  assert.equal(moi.trang_thai, 401);
});

test('nâng phiên bản tối thiểu trong cau_hinh có hiệu lực với ứng dụng cũ', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  m.kho._du_lieu.cau_hinh.set('he_thong', { _id: 'he_thong', phien_ban_toi_thieu: '0.5.0' });
  const cu = await m.goi('/auth/login', { phuong_thuc: 'POST', phien_ban: '0.4.9', du_lieu: { ten_dang_nhap: 'admin', mat_khau: MK } });
  assert.equal(cu.trang_thai, 426);
  assert.equal(cu.json.loi.phien_ban_toi_thieu, '0.5.0');
});

test('đăng nhập đúng → token dùng được cho /auth/me; phản hồi không lộ mật khẩu băm', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const dn = await m.dang_nhap();
  assert.equal(dn.trang_thai, 200);
  assert.equal(dn.json.tai_khoan.loai, 'admin');
  assert.equal(dn.json.tai_khoan.quyen_ghi, true);
  assert.ok(dn.json.token && dn.json.het_han_luc);
  assert.equal(dn.text.includes('mat_khau_bam'), false);
  const me = await m.goi('/auth/me', { tieu_de: { authorization: `Bearer ${dn.json.token}` } });
  assert.equal(me.trang_thai, 200);
  assert.equal(me.json.tai_khoan.ten_dang_nhap, 'admin');
  assert.equal(me.text.includes('mat_khau_bam'), false);
  assert.equal(me.text.includes('so_phien_token'), false);
});

test('tài khoản xem_mot_so_muc: /auth/me trả đúng danh sách mục và quyen_ghi = false', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const dn = await m.dang_nhap('xem');
  const me = await m.goi('/auth/me', { tieu_de: { authorization: `Bearer ${dn.json.token}` } });
  assert.deepEqual(me.json.tai_khoan.muc_duoc_xem, ['thong_tin_co_ban', 'luong']);
  assert.equal(me.json.tai_khoan.quyen_ghi, false);
  assert.equal(me.json.tai_khoan.buoc_doi_mat_khau, true);
});

test('sai thông tin → 401 cùng thông điệp; sai quá ngưỡng → 429 kèm Retry-After; nhật ký có đủ', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const a = await m.dang_nhap('admin', 'sai');
  const b = await m.dang_nhap('khong_co', 'sai');
  assert.equal(a.trang_thai, 401);
  assert.deepEqual(a.json.loi, b.json.loi);
  for (let i = 0; i < GIOI_HAN.tai_khoan; i += 1) await m.dang_nhap('admin', 'sai');
  const khoa = await m.dang_nhap('admin', MK);
  assert.equal(khoa.trang_thai, 429);
  assert.equal(khoa.json.loi.ma, 'TAM_KHOA');
  assert.equal(khoa.tieu_de.get('retry-after'), '900');
  assert.ok(m.kho._du_lieu.nhat_ky.length >= 3);
  assert.equal(JSON.stringify(m.kho._du_lieu.nhat_ky).includes(MK), false);
});

test('/auth/me: thiếu token, token ký sai khóa, alg none, hết hạn, đổi phiên, tài khoản bị khóa → đều 401', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const me = (token) => m.goi('/auth/me', { tieu_de: token ? { authorization: `Bearer ${token}` } : {} });
  assert.equal((await me(null)).trang_thai, 401);
  assert.equal((await me('khong-phai-jwt-nhung-du-dai-20')).trang_thai, 401);

  const id = String(m.kho._du_lieu.nguoi_dung[0]._id);
  const giay = Math.floor(m.dong_ho.now() / 1000);
  const khoa_la = jwt.sign({ sub: id, pv: 1, iat: giay, exp: giay + 600 }, 'z'.repeat(64), { algorithm: 'HS256', issuer: 'hrm-api', audience: 'hrm-app' });
  assert.equal((await me(khoa_la)).trang_thai, 401);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const khong_ky = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: id, pv: 1, iss: 'hrm-api', aud: 'hrm-app', exp: giay + 600 })}.`;
  assert.equal((await me(khong_ky)).trang_thai, 401);

  const dn = await m.dang_nhap();
  assert.equal((await me(dn.json.token)).trang_thai, 200);
  m.dong_ho.tien(31 * 60 * 1000);
  assert.equal((await me(dn.json.token)).trang_thai, 401, 'hết hạn sau 30 phút');
  m.dong_ho.tien(-31 * 60 * 1000);

  m.kho._du_lieu.nguoi_dung[0].so_phien_token = 2;
  assert.equal((await me(dn.json.token)).trang_thai, 401, 'đổi so_phien_token làm token cũ mất hiệu lực');
  m.kho._du_lieu.nguoi_dung[0].so_phien_token = 1;
  assert.equal((await me(dn.json.token)).trang_thai, 200);
  m.kho._du_lieu.nguoi_dung[0].khoa = true;
  assert.equal((await me(dn.json.token)).trang_thai, 401, 'tài khoản bị khóa mất hiệu lực ngay');
});

test('dữ liệu đầu vào sai: JSON hỏng, thiếu trường, trường thừa, kiểu sai (chèn toán tử), quá lớn', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const hong = await m.goi('/auth/login', { phuong_thuc: 'POST', tho: '{"ten_dang_nhap":' });
  assert.equal(hong.trang_thai, 400);
  assert.equal(hong.json.loi.ma, 'DU_LIEU_KHONG_HOP_LE');
  const thieu = await m.goi('/auth/login', { phuong_thuc: 'POST', du_lieu: { ten_dang_nhap: 'admin' } });
  assert.equal(thieu.trang_thai, 400);
  assert.ok(thieu.json.loi.chi_tiet.some((c) => c.truong === 'mat_khau'));
  const thua = await m.goi('/auth/login', { phuong_thuc: 'POST', du_lieu: { ten_dang_nhap: 'admin', mat_khau: MK, la: 1 } });
  assert.equal(thua.trang_thai, 400);
  const toan_tu = await m.goi('/auth/login', { phuong_thuc: 'POST', du_lieu: { ten_dang_nhap: { $gt: '' }, mat_khau: 'x' } });
  assert.equal(toan_tu.trang_thai, 400);
  assert.ok(toan_tu.json.loi.chi_tiet.some((c) => c.truong === 'ten_dang_nhap'));
  const lon = await m.goi('/auth/login', { phuong_thuc: 'POST', du_lieu: { ten_dang_nhap: 'a', mat_khau: 'x'.repeat(60000) } });
  assert.equal(lon.trang_thai, 413);
  assert.equal(lon.json.loi.ma, 'DU_LIEU_QUA_LON');
  const dai = await m.goi('/auth/login', { phuong_thuc: 'POST', du_lieu: { ten_dang_nhap: 'admin', mat_khau: 'x'.repeat(73) } });
  assert.equal(dai.trang_thai, 400, 'mật khẩu quá 72 byte bị từ chối, không bị bcrypt cắt ngầm');
});

test('lỗi thống nhất: có mã yêu cầu; 404 dạng JSON; lỗi nội bộ không lộ chi tiết', async (t) => {
  const m = await khoi_dong(); t.after(m.dong);
  const khong_co = await m.goi('/khong/co');
  assert.equal(khong_co.trang_thai, 404);
  assert.equal(khong_co.json.loi.ma, 'KHONG_TIM_THAY');
  assert.equal(khong_co.json.ma_yeu_cau, khong_co.tieu_de.get('x-request-id'));

  const noi_bo = await m.goi('/__loi');
  assert.equal(noi_bo.trang_thai, 500);
  assert.equal(noi_bo.json.loi.ma, 'LOI_MAY_CHU');
  assert.equal(noi_bo.text.includes('abc123'), false);
  assert.equal(noi_bo.text.includes('chi tiết nội bộ'), false);
  assert.equal(noi_bo.text.includes('stack'), false);
  assert.equal(m.log_loi.length, 1, 'chi tiết chỉ nằm trong log máy chủ');
});
