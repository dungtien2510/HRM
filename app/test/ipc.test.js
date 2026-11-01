'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { dang_ky_ipc, la_nguon_tin_cay } = require('../src/main/ipc');

const INDEX = path.resolve('/ung_dung/src/renderer/index.html');
const khung_chinh = { url: pathToFileURL(INDEX).href };
const su_kien_tot = { senderFrame: khung_chinh, sender: { mainFrame: khung_chinh } };

test('la_nguon_tin_cay: chỉ nhận khung chính của file index.html của ứng dụng', () => {
  assert.equal(la_nguon_tin_cay(su_kien_tot, INDEX), true);
  const khung_con = { url: khung_chinh.url };
  assert.equal(la_nguon_tin_cay({ senderFrame: khung_con, sender: { mainFrame: khung_chinh } }, INDEX), false, 'khung con');
  for (const url of ['https://ke-xau.example/', 'file:///ung_dung/src/renderer/khac.html', 'about:blank', 'khong-phai-url', '']) {
    const k = { url };
    assert.equal(la_nguon_tin_cay({ senderFrame: k, sender: { mainFrame: k } }, INDEX), false, url);
  }
  assert.equal(la_nguon_tin_cay({}, INDEX), false);
  assert.equal(la_nguon_tin_cay(null, INDEX), false);
});

function dung() {
  const kenh = new Map();
  const ipcMain = { handle: (ten, ham) => kenh.set(ten, ham) };
  const goi_api = [];
  const luu = [];
  let bat_dau = 0;
  const api = {
    kiem_tra_may_chu: async (url) => { goi_api.push(['kiem_tra', url]); return api._kq_kiem_tra; },
    dang_nhap: async (t, m) => { goi_api.push(['dang_nhap', t, m]); return { ok: true, du_lieu: {} }; },
    dang_xuat: () => ({ ok: true }), toi_la_ai: async () => ({ ok: true }), trang_thai_ket_noi: () => ({ trang_thai: 'ket_noi_tot' }), kiem_tra_dinh_ky: async () => ({}),
    _kq_kiem_tra: { ok: true, thong_diep: 'ổn' },
  };
  const cau_hinh_may = { doc: () => ({ dia_chi_may_chu: null }), luu_dia_chi_may_chu: (u) => { luu.push(u); return u; } };
  dang_ky_ipc({ ipcMain, api, cau_hinh_may, hang_so: { MUC_QUYEN: [] }, phien_ban_ung_dung: '0.1.0', duong_dan_index: INDEX, bat_dau_kiem_tra_dinh_ky: () => { bat_dau += 1; } });
  return { goi: (k, ...a) => kenh.get(k)(su_kien_tot, ...a), goi_kem_su_kien: (k, e, ...a) => kenh.get(k)(e, ...a), kenh, api, goi_api, luu, bat_dau: () => bat_dau };
}

test('từ chối yêu cầu từ nguồn không tin cậy ở mọi kênh', async () => {
  const m = dung();
  const la = { senderFrame: { url: 'https://ke-xau.example/' }, sender: {} };
  for (const k of m.kenh.keys()) {
    const kq = await m.goi_kem_su_kien(k, la, 'a', 'b');
    assert.equal(kq.ma, 'YEU_CAU_KHONG_HOP_LE', k);
  }
  assert.equal(m.goi_api.length, 0);
});

test('kiểm tra kiểu và độ dài đối số', async () => {
  const m = dung();
  for (const dn of [[1, 'x'], ['x', 2], ['a'.repeat(65), 'x'], ['x', 'm'.repeat(129)], [{}, []], [null, null]]) {
    assert.equal((await m.goi('hrm:dang_nhap', ...dn)).ma, 'YEU_CAU_KHONG_HOP_LE', JSON.stringify(dn).slice(0, 40));
  }
  assert.equal((await m.goi('hrm:kiem_tra_va_luu_may_chu', 5)).ma, 'YEU_CAU_KHONG_HOP_LE');
  assert.equal(m.goi_api.length, 0);
  assert.equal((await m.goi('hrm:dang_nhap', 'admin', 'mk')).ok, true);
  assert.deepEqual(m.goi_api[0], ['dang_nhap', 'admin', 'mk']);
});

test('lưu máy chủ: địa chỉ sai không gọi mạng; kiểm tra thất bại không lưu; thành công thì lưu và bật kiểm tra định kỳ', async () => {
  const m = dung();
  const sai = await m.goi('hrm:kiem_tra_va_luu_may_chu', 'http://x.local');
  assert.equal(sai.ma, 'DIA_CHI_KHONG_HOP_LE');
  assert.equal(m.goi_api.length, 0);

  m.api._kq_kiem_tra = { ok: false, ma: 'CHUNG_CHI_KHONG_TIN_CAY', thong_diep: 'x' };
  const hong = await m.goi('hrm:kiem_tra_va_luu_may_chu', 'hrm.tieudoantt.local');
  assert.equal(hong.ok, false);
  assert.deepEqual(m.luu, []);
  assert.equal(m.bat_dau(), 0);

  m.api._kq_kiem_tra = { ok: true, thong_diep: 'ổn' };
  const tot = await m.goi('hrm:kiem_tra_va_luu_may_chu', 'hrm.tieudoantt.local');
  assert.equal(tot.ok, true);
  assert.equal(tot.dia_chi, 'https://hrm.tieudoantt.local:8443');
  assert.deepEqual(m.luu, ['https://hrm.tieudoantt.local:8443']);
  assert.equal(m.bat_dau(), 1);
});

test('lỗi bất ngờ bên trong không lộ chi tiết ra renderer', async () => {
  const m = dung();
  m.api.toi_la_ai = async () => { throw new Error('chi tiết nội bộ bí mật'); };
  const kq = await m.goi('hrm:toi_la_ai');
  assert.equal(kq.ma, 'LOI_UNG_DUNG');
  assert.equal(JSON.stringify(kq).includes('bí mật'), false);
});
