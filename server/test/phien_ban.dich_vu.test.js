'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { tao_kiem_tra_phien_ban } = require('../src/dich_vu/phien_ban');
const { tao_kho_bo_nho } = require('./ho_tro/kho_bo_nho');
const { tao_dong_ho_gia } = require('./ho_tro/gia');

test('đọc phiên bản tối thiểu từ cau_hinh và nhớ đệm ngắn', async () => {
  const kho = tao_kho_bo_nho();
  const dong_ho = tao_dong_ho_gia();
  await kho.cau_hinh.dat_neu_chua_co('he_thong', { phien_ban_toi_thieu: '0.2.0' });
  let so_lan_doc = 0;
  const doc_dem = { lay: async (m) => { so_lan_doc += 1; return kho.cau_hinh.lay(m); } };
  const kt = tao_kiem_tra_phien_ban({ kho_cau_hinh: doc_dem, mac_dinh: '0.1.0', dong_ho: dong_ho.now, nho_dem_ms: 30000 });
  assert.equal(await kt.phien_ban_toi_thieu(), '0.2.0');
  assert.equal(await kt.phien_ban_toi_thieu(), '0.2.0');
  assert.equal(so_lan_doc, 1);
  dong_ho.tien(31000);
  await kt.phien_ban_toi_thieu();
  assert.equal(so_lan_doc, 2);
});

test('không có hoặc sai giá trị trong cau_hinh → dùng mặc định', async () => {
  const kho = tao_kho_bo_nho();
  const kt = tao_kiem_tra_phien_ban({ kho_cau_hinh: kho.cau_hinh, mac_dinh: '0.1.0' });
  assert.equal(await kt.phien_ban_toi_thieu(), '0.1.0');
  await kho.cau_hinh.dat_neu_chua_co('he_thong', { phien_ban_toi_thieu: 'hong' });
  kt.xoa_nho_dem();
  assert.equal(await kt.phien_ban_toi_thieu(), '0.1.0');
});

test('lỗi đọc CSDL: dùng giá trị đã nhớ nếu có, chưa có thì báo lỗi', async () => {
  const dong_ho = tao_dong_ho_gia();
  let hong = false;
  const kho_cau_hinh = { lay: async () => { if (hong) throw new Error('mất kết nối'); return { phien_ban_toi_thieu: '0.3.0' }; } };
  const kt = tao_kiem_tra_phien_ban({ kho_cau_hinh, mac_dinh: '0.1.0', dong_ho: dong_ho.now, nho_dem_ms: 1000 });
  hong = true;
  await assert.rejects(kt.phien_ban_toi_thieu(), /mất kết nối/);
  hong = false;
  assert.equal(await kt.phien_ban_toi_thieu(), '0.3.0');
  hong = true;
  dong_ho.tien(5000);
  assert.equal(await kt.phien_ban_toi_thieu(), '0.3.0');
});
