'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { tao_db_gia } = require('./ho_tro/db_gia');
const { dam_bao_cau_truc, dam_bao_collection, dam_bao_chi_muc, dem_vi_pham, gieo_cau_hinh, dam_bao_vai_tro, kiem_tra_phien_ban_schema, PHIEN_BAN_SCHEMA, chuan_json } = require('../src/csdl/cau_truc');
const { tao_validator } = require('../src/csdl/schema');
const { CHI_MUC, DANH_SACH_COLLECTION } = require('../src/csdl/chi_muc');
const { tao_dac_quyen } = require('../src/kho/danh_sach_collection');

const SAU_COLLECTION = ['nhan_su', 'nghi_phep', 'nguoi_dung', 'nhat_ky', 'cau_hinh', 'luot_dang_nhap'];
const thao_tac_thay_doi = (db) => db._thao_tac.filter(([t]) => ['createCollection', 'collMod', 'createIndex', 'dropIndex', 'rename'].includes(t));

test('CSDL rỗng: tạo đủ 6 collection có validator strict/error và đủ chỉ mục', async () => {
  const db = tao_db_gia();
  const bao_cao = await dam_bao_cau_truc(db);
  assert.deepEqual(Object.keys(bao_cao), SAU_COLLECTION);
  for (const ten of SAU_COLLECTION) {
    const c = db._cols.get(ten);
    assert.ok(c, ten);
    assert.equal(c.options.validationLevel, 'strict');
    assert.equal(c.options.validationAction, 'error');
    assert.equal(chuan_json(c.options.validator), chuan_json(tao_validator(ten)), `validator của ${ten}`);
    for (const spec of CHI_MUC[ten]) assert.ok(c.indexes.some((i) => i.name === spec.ten), `${ten}.${spec.ten}`);
    assert.equal(bao_cao[ten].collection, 'tao');
  }
});

test('chạy lại nhiều lần không thay đổi gì (idempotent)', async () => {
  const db = tao_db_gia();
  await dam_bao_cau_truc(db);
  const sau_lan_1 = thao_tac_thay_doi(db).length;
  for (let i = 0; i < 3; i += 1) {
    const bao_cao = await dam_bao_cau_truc(db);
    for (const ten of SAU_COLLECTION) {
      assert.equal(bao_cao[ten].collection, 'giu', `${ten} lần ${i + 2}`);
      assert.equal(bao_cao[ten].chi_muc.tao.length + bao_cao[ten].chi_muc.tao_lai.length, 0, `${ten} chỉ mục lần ${i + 2}`);
    }
  }
  assert.equal(thao_tac_thay_doi(db).length, sau_lan_1);
});

test('validator bị lệch (ai đó sửa/gỡ) thì được ép lại bằng collMod; lệch cả level/action cũng sửa', async () => {
  const db = tao_db_gia();
  await dam_bao_cau_truc(db);
  db._cols.get('nhat_ky').options.validator = { $jsonSchema: { bsonType: 'object' } };
  db._cols.get('nhan_su').options.validationAction = 'warn';
  delete db._cols.get('nguoi_dung').options.validator;
  const bao_cao = await dam_bao_cau_truc(db);
  assert.equal(bao_cao.nhat_ky.collection, 'cap_nhat');
  assert.equal(bao_cao.nhan_su.collection, 'cap_nhat');
  assert.equal(bao_cao.nguoi_dung.collection, 'cap_nhat');
  assert.equal(bao_cao.cau_hinh.collection, 'giu');
  assert.equal(db._cols.get('nhan_su').options.validationAction, 'error');
  assert.equal(chuan_json(db._cols.get('nhat_ky').options.validator), chuan_json(tao_validator('nhat_ky')));
});

test('chỉ mục bị lệch được tạo lại; chỉ mục thiếu được tạo; chỉ mục lạ không đụng tới', async () => {
  const db = tao_db_gia();
  await dam_bao_cau_truc(db);
  const nhan_su = db._cols.get('nhan_su');
  nhan_su.indexes.find((i) => i.name === 'ma_nhan_vien_duy_nhat').unique = false;           // mất tính duy nhất
  nhan_su.indexes.splice(nhan_su.indexes.findIndex((i) => i.name === 'bo_phan'), 1);       // mất chỉ mục
  nhan_su.indexes.push({ v: 2, key: { ghi_chu_rieng: 1 }, name: 'chi_muc_cua_nguoi_dung' }); // chỉ mục ngoài thiết kế
  const bao_cao = await dam_bao_chi_muc(db, 'nhan_su');
  assert.deepEqual(bao_cao.tao_lai, ['ma_nhan_vien_duy_nhat']);
  assert.deepEqual(bao_cao.tao, ['bo_phan']);
  assert.equal(nhan_su.indexes.find((i) => i.name === 'ma_nhan_vien_duy_nhat').unique, true);
  assert.ok(nhan_su.indexes.some((i) => i.name === 'chi_muc_cua_nguoi_dung'));
});

test('chỉ mục cùng khóa nhưng khác tên (di sản) bị thay bằng chỉ mục đúng tên', async () => {
  const db = tao_db_gia();
  await db.createCollection('nguoi_dung', { validator: tao_validator('nguoi_dung') });
  await db.collection('nguoi_dung').createIndex({ ten_dang_nhap: 1 }, { name: 'ten_cu', unique: true });
  const bao_cao = await dam_bao_chi_muc(db, 'nguoi_dung');
  assert.ok(bao_cao.tao_lai.includes('ten_dang_nhap_duy_nhat'));
  assert.equal(db._cols.get('nguoi_dung').indexes.some((i) => i.name === 'ten_cu'), false);
});

test('chỉ mục TTL và chỉ mục một-admin có đúng tuỳ chọn', async () => {
  const db = tao_db_gia();
  await dam_bao_cau_truc(db);
  const ttl = db._cols.get('luot_dang_nhap').indexes.find((i) => i.name === 'tu_xoa_khi_het_han');
  assert.equal(ttl.expireAfterSeconds, 0);
  const admin = db._cols.get('nguoi_dung').indexes.find((i) => i.name === 'chi_mot_admin');
  assert.equal(admin.unique, true);
  assert.deepEqual(admin.partialFilterExpression, { loai: 'admin' });
});

test('validator của CSDL giả từ chối tài liệu sai và nhận tài liệu đúng (nhan_su/nguoi_dung)', async () => {
  const db = tao_db_gia();
  await dam_bao_cau_truc(db);
  await assert.rejects(db.collection('nhan_su').insertOne({ ma_nhan_vien: 'X' }), (e) => e.code === 121);
  await assert.rejects(db.collection('nguoi_dung').insertOne({ ten_dang_nhap: 'a' }), (e) => e.code === 121);
  await assert.rejects(db.collection('nhat_ky').insertOne({ hanh_dong: 'dang_nhap' }), (e) => e.code === 121);
});

test('gieo_cau_hinh chỉ chèn khi chưa có, không ghi đè cấu hình đang dùng', async () => {
  const db = tao_db_gia();
  await dam_bao_cau_truc(db);
  const bay_gio = new Date(Date.UTC(2026, 9, 24));
  await gieo_cau_hinh(db, { bay_gio, schema_version: 0, ten_don_vi: 'Đơn vị A', phien_ban_toi_thieu: '0.2.0' });
  await gieo_cau_hinh(db, { bay_gio, schema_version: 0, ten_don_vi: 'Đơn vị KHÁC' });
  const doc = await db.collection('cau_hinh').findOne({ _id: 'he_thong' });
  assert.equal(doc.ten_don_vi, 'Đơn vị A');
  assert.equal(doc.phien_ban_toi_thieu, '0.2.0');
  assert.deepEqual(Object.keys(doc.cai_dat_sao_luu).sort(), ['bat', 'giu_toi_da_ban', 'ket_qua_lan_cuoi', 'lan_cuoi', 'gio', 'thu_muc'].sort());
  assert.equal(doc.cai_dat_sao_luu.bat, false);
});

test('dam_bao_vai_tro: chưa có vai trò thì báo, có rồi thì cập nhật đúng đặc quyền tối thiểu', async () => {
  const khong = tao_db_gia({ co_vai_tro: false });
  assert.equal(await dam_bao_vai_tro(khong, 'hrm_nhan_su'), 'chua_co_vai_tro');
  const co = tao_db_gia();
  assert.equal(await dam_bao_vai_tro(co, 'hrm_nhan_su'), 'cap_nhat');
  assert.deepEqual(co._vai_tro.get('vai_tro_hrm_ung_dung').privileges, tao_dac_quyen('hrm_nhan_su'));
});

test('kiem_tra_phien_ban_schema: từ chối khi chưa khởi tạo hoặc sai phiên bản, chấp nhận đúng phiên bản', async () => {
  const db = tao_db_gia();
  await assert.rejects(kiem_tra_phien_ban_schema(db), /chưa khởi tạo[\s\S]*nang_cap_csdl/);
  await dam_bao_cau_truc(db);
  const bay_gio = new Date();
  await gieo_cau_hinh(db, { bay_gio, schema_version: 1 });
  await assert.rejects(kiem_tra_phien_ban_schema(db), /CSDL: 1, mã nguồn cần: 2/);
  await db.collection('cau_hinh').updateOne({ _id: 'he_thong' }, { $set: { schema_version: PHIEN_BAN_SCHEMA } });
  assert.equal(await kiem_tra_phien_ban_schema(db), 2);
});

test('dem_vi_pham đếm tài liệu có sẵn không đạt validator (dữ liệu đã có trước khi gắn validator)', async () => {
  const db = tao_db_gia();
  await db.collection('nhan_su').insertOne({ _id: { _bsontype: 'ObjectId', id: 'a' }, ma_nhan_vien: 'X' });
  await dam_bao_collection(db, 'nhan_su');
  assert.equal(await dem_vi_pham(db, 'nhan_su'), 1);
});

test('DANH_SACH_COLLECTION có đủ 5 collection nghiệp vụ + luot_dang_nhap', () => {
  assert.deepEqual([...DANH_SACH_COLLECTION].sort(), [...SAU_COLLECTION].sort());
});
