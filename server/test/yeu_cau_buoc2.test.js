'use strict';
/** Kiểm tra từng yêu cầu của Bước 2 (chỉ mục, đặc quyền, cấu hình) để thay đổi sau này không âm thầm phá chúng. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { CHI_MUC, DANH_SACH_COLLECTION } = require('../src/csdl/chi_muc');
const { tao_dac_quyen, VAI_TRO_UNG_DUNG, QUYEN_THEO_COLLECTION } = require('../src/kho/danh_sach_collection');
const { PHIEN_BAN_SCHEMA, tao_cau_hinh_mac_dinh } = require('../src/csdl/cau_truc');

const tim = (collection, ten) => CHI_MUC[collection].find((c) => c.ten === ten);

test('chỉ mục theo yêu cầu: ma_nhan_vien (duy nhất), bo_phan, tim_kiem, than_nhan.ngay_sinh, ngày khen thưởng', () => {
  assert.deepEqual(tim('nhan_su', 'ma_nhan_vien_duy_nhat').khoa, { ma_nhan_vien: 1 });
  assert.equal(tim('nhan_su', 'ma_nhan_vien_duy_nhat').tuy_chon.unique, true);
  assert.deepEqual(tim('nhan_su', 'bo_phan').khoa, { bo_phan: 1 });
  assert.deepEqual(tim('nhan_su', 'tim_kiem').khoa, { tim_kiem: 1 });
  assert.deepEqual(tim('nhan_su', 'than_nhan_ngay_sinh').khoa, { 'than_nhan.ngay_sinh.ngay_chuan_hoa': 1 });
  assert.deepEqual(tim('nhan_su', 'khen_thuong_thoi_diem').khoa, { 'khen_thuong.thoi_diem.ngay_chuan_hoa': 1 });
});

test('chỉ mục theo yêu cầu: nghi_phep (nhan_su_id, tu_ngay, den_ngay), nguoi_dung.ten_dang_nhap duy nhất, nhat_ky theo thời gian', () => {
  assert.deepEqual(Object.keys(tim('nghi_phep', 'nhan_su_tu_den').khoa), ['nhan_su_id', 'tu_ngay', 'den_ngay']);
  assert.equal(tim('nguoi_dung', 'ten_dang_nhap_duy_nhat').tuy_chon.unique, true);
  assert.deepEqual(tim('nguoi_dung', 'ten_dang_nhap_duy_nhat').khoa, { ten_dang_nhap: 1 });
  assert.deepEqual(tim('nhat_ky', 'thoi_diem_giam').khoa, { thoi_diem: -1 });
  assert.deepEqual(tim('nguoi_dung', 'chi_mot_admin').tuy_chon.partialFilterExpression, { loai: 'admin' });
});

test('tên chỉ mục không trùng trong mỗi collection; khóa chỉ mục trỏ tới trường đã khai báo của nhan_su', () => {
  const S = require('@hrm/shared');
  for (const [c, ds] of Object.entries(CHI_MUC)) assert.equal(new Set(ds.map((d) => d.ten)).size, ds.length, c);
  for (const spec of CHI_MUC.nhan_su) for (const duong_dan of Object.keys(spec.khoa)) assert.ok(S.tim_truong('nhan_su', duong_dan), `${spec.ten}: ${duong_dan} chưa khai báo`);
  for (const spec of CHI_MUC.nghi_phep) for (const duong_dan of Object.keys(spec.khoa)) assert.ok(S.tim_truong('nghi_phep', duong_dan), `${spec.ten}: ${duong_dan} chưa khai báo`);
});

test('nhat_ky chỉ ghi thêm: user ứng dụng chỉ có find + insert (không update, không remove, không xóa/đổi tên collection)', () => {
  const dq = tao_dac_quyen('hrm_nhan_su').find((p) => p.resource.collection === 'nhat_ky');
  assert.deepEqual([...dq.actions].sort(), ['find', 'insert', 'killCursors']);
  for (const cam of ['update', 'remove', 'dropCollection', 'renameCollectionSameDB', 'collMod', 'createIndex', 'dropIndex']) assert.equal(dq.actions.includes(cam), false, cam);
});

test('quyền tối thiểu: chỉ một CSDL, không quyền cấu trúc ở mọi collection, đủ các collection, cau_hinh không bị xóa', () => {
  const dq = tao_dac_quyen('hrm_nhan_su');
  assert.equal(VAI_TRO_UNG_DUNG, 'vai_tro_hrm_ung_dung');
  assert.deepEqual(dq.map((p) => p.resource.collection).sort(), [...DANH_SACH_COLLECTION].sort());
  for (const p of dq) {
    assert.equal(p.resource.db, 'hrm_nhan_su');
    assert.ok(p.resource.collection !== '', 'không cấp quyền trên mọi collection');
    for (const cam of ['createCollection', 'collMod', 'createIndex', 'dropIndex', 'dropCollection', 'dropDatabase', 'renameCollectionSameDB', 'listCollections', 'anyAction']) {
      assert.equal(p.actions.includes(cam), false, `${p.resource.collection}: ${cam}`);
    }
    assert.equal(p.resource.cluster, undefined);
    assert.equal(p.resource.anyResource, undefined);
  }
  assert.equal(QUYEN_THEO_COLLECTION.cau_hinh.includes('remove'), false);
  assert.equal(QUYEN_THEO_COLLECTION.nhan_su.includes('remove'), true, 'admin xóa hồ sơ qua API');
  assert.equal(QUYEN_THEO_COLLECTION.luot_dang_nhap.includes('update'), false);
  const khac = tao_dac_quyen('csdl_khac');
  assert.ok(khac.every((p) => p.resource.db === 'csdl_khac'));
});

test('cấu hình mặc định có đủ trường theo yêu cầu: ten_don_vi, schema_version, phien_ban_toi_thieu, cai_dat_sao_luu', () => {
  const ch = tao_cau_hinh_mac_dinh({ bay_gio: new Date(), schema_version: 2 });
  for (const t of ['ten_don_vi', 'schema_version', 'phien_ban_toi_thieu', 'cai_dat_sao_luu']) assert.ok(t in ch, t);
  assert.equal(PHIEN_BAN_SCHEMA, 2);
  assert.equal(ch.cai_dat_sao_luu.bat, false, 'sao lưu mặc định tắt cho tới khi cấu hình');
});
