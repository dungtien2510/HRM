'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { tao_db_gia } = require('./ho_tro/db_gia');
const { nang_cap_csdl } = require('../src/csdl/nang_cap/chay');
const { doc_trang_thai } = require('../src/csdl/nang_cap/trang_thai');
const { chuyen_tai_khoan_v1, kiem_tra_tai_khoan_v1, chuyen_cau_hinh_v1 } = require('../src/csdl/nang_cap/chuyen_doi_v1');
const { chuan_json } = require('../src/csdl/cau_truc');
const { tao_validator } = require('../src/csdl/schema');
const { kiem_tra_validator } = require('./ho_tro/kiem_tra_schema');

const CSDL = 'hrm_nhan_su';
const HASH = `$2b$12$${'a'.repeat(53)}`;
const oid = (id) => ({ _bsontype: 'ObjectId', id });
const T0 = new Date(Date.UTC(2026, 9, 18, 8, 0, 0));
const BAY_GIO = new Date(Date.UTC(2026, 9, 24, 9, 0, 0));
const chay = (db, tuy = {}) => nang_cap_csdl(db, CSDL, { dong_ho: () => BAY_GIO, ...tuy });
const thao_tac_thay_doi = (db) => db._thao_tac.filter(([t]) => ['createCollection', 'collMod', 'createIndex', 'dropIndex', 'rename', 'replaceOne'].includes(t));

/** Dựng CSDL đúng như Bước 1 để lại: tai_khoan, nhat_ky, cau_hinh (không có schema_version), luot_dang_nhap. */
async function tao_db_buoc_1({ them_tai_khoan_hong = false, hai_admin = false } = {}) {
  const db = tao_db_gia();
  const tk = db.collection('tai_khoan');
  await tk.insertOne({ _id: oid('a1'), ten_dang_nhap: 'admin', ten_hien_thi: 'Quản trị', mat_khau_bam: HASH, loai: 'admin', cac_muc_duoc_xem: [], trang_thai: 'hoat_dong', so_phien_token: 3, tao_luc: T0, sua_luc: T0 });
  await tk.insertOne({ _id: oid('b2'), ten_dang_nhap: 'ketoan', mat_khau_bam: HASH, loai: 'xem_mot_so_muc', cac_muc_duoc_xem: ['luong', 'lien_he', 'khong_co_muc_nay'], trang_thai: 'khoa', so_phien_token: 1, tao_luc: T0, sua_luc: T0 });
  if (hai_admin) await tk.insertOne({ _id: oid('c3'), ten_dang_nhap: 'admin2', mat_khau_bam: HASH, loai: 'admin', cac_muc_duoc_xem: [], trang_thai: 'hoat_dong', so_phien_token: 1, tao_luc: T0, sua_luc: T0 });
  if (them_tai_khoan_hong) await tk.insertOne({ _id: oid('d4'), ten_dang_nhap: 'Sai Ten', mat_khau_bam: 'chu_ro', loai: 'la', trang_thai: 'hoat_dong' });
  await db.collection('cau_hinh').insertOne({ _id: 'he_thong', phien_ban_toi_thieu: '0.3.0', tao_luc: T0, sua_luc: T0 });
  await db.collection('nhat_ky').insertOne({ _id: oid('n1'), thoi_diem: T0, hanh_dong: 'dang_nhap', ket_qua: 'thanh_cong', tai_khoan: { id: 'a1', ten: 'admin' }, may: { ten: 'MAY-01', ip: '192.168.1.21' }, phien_ban_ung_dung: '0.1.0' });
  await db.collection('luot_dang_nhap').insertOne({ _id: oid('l1'), khoa: 'tk:admin', luc: T0, het_han: new Date(T0.getTime() + 900000) });
  return db;
}

// ---------- hàm chuyển đổi thuần ----------
test('chuyen_tai_khoan_v1: đổi tên trường, suy ra khoa, lọc mục lạ, giữ _id', () => {
  const kq = chuyen_tai_khoan_v1({ _id: oid('b2'), ten_dang_nhap: 'ketoan', mat_khau_bam: HASH, loai: 'xem_mot_so_muc', cac_muc_duoc_xem: ['luong', 'luong', 'khong_co'], trang_thai: 'khoa', so_phien_token: 5, tao_luc: T0, sua_luc: BAY_GIO }, BAY_GIO);
  assert.deepEqual(kq.muc_duoc_xem, ['luong']);
  assert.equal(kq.khoa, true);
  assert.equal(kq.ten_hien_thi, 'ketoan');
  assert.equal(kq.so_phien_token, 5);
  assert.equal(kq.created_at, T0);
  assert.equal(kq.updated_at, BAY_GIO);
  assert.deepEqual(kq._id, oid('b2'));
  assert.equal('trang_thai' in kq, false);
  assert.equal('cac_muc_duoc_xem' in kq, false);
  assert.equal(chuyen_tai_khoan_v1({ _id: 1, ten_dang_nhap: 'a', trang_thai: 'hoat_dong' }, BAY_GIO).khoa, false);
  assert.equal(chuyen_tai_khoan_v1({ _id: 1, ten_dang_nhap: 'a', khoa: true }, BAY_GIO).khoa, true, 'đã ở dạng mới thì giữ');
});

test('kiem_tra_tai_khoan_v1 nêu rõ vấn đề', () => {
  assert.deepEqual(kiem_tra_tai_khoan_v1({ ten_dang_nhap: 'admin', mat_khau_bam: HASH, loai: 'admin' }), []);
  const loi = kiem_tra_tai_khoan_v1({ ten_dang_nhap: 'Sai Ten', mat_khau_bam: 'chu_ro', loai: 'la' });
  assert.equal(loi.length, 3);
});

test('chuyen_cau_hinh_v1: giữ phiên bản tối thiểu đang dùng, thêm trường mới, đổi tên mốc thời gian', () => {
  const kq = chuyen_cau_hinh_v1({ _id: 'he_thong', phien_ban_toi_thieu: '0.3.0', tao_luc: T0, sua_luc: T0 }, BAY_GIO);
  assert.equal(kq.phien_ban_toi_thieu, '0.3.0');
  assert.equal(kq.schema_version, 1);
  assert.equal(kq.created_at, T0);
  assert.ok(kq.ten_don_vi && kq.cai_dat_sao_luu && kq.cai_dat_sao_luu.giu_toi_da_ban === 14);
  assert.equal('tao_luc' in kq, false);
  assert.deepEqual(kiem_tra_validator(tao_validator('cau_hinh'), kq), []);
});

// ---------- nâng cấp từ CSDL rỗng ----------
test('CSDL rỗng: phát hiện phiên bản 0, nâng lên 2, tạo cấu hình, 6 collection, chỉ mục', async () => {
  const db = tao_db_gia();
  assert.equal((await doc_trang_thai(db)).hien_tai, 0);
  const kq = await chay(db);
  assert.equal(kq.hien_tai, 0);
  assert.deepEqual(kq.da_chay, [2]);
  assert.equal(kq.da_hoan_tat, true);
  assert.deepEqual(kq.loi, []);
  const ch = await db.collection('cau_hinh').findOne({ _id: 'he_thong' });
  assert.equal(ch.schema_version, 2);
  assert.equal(ch.phien_ban_toi_thieu, '0.1.0');
  assert.deepEqual([...db._cols.keys()].sort(), ['cau_hinh', 'luot_dang_nhap', 'nghi_phep', 'nguoi_dung', 'nhan_su', 'nhat_ky']);
  assert.equal((await doc_trang_thai(db)).hien_tai, 2);
});

test('chạy lại khi đã đúng phiên bản: không bước nào chạy, không thay đổi cấu trúc', async () => {
  const db = tao_db_gia();
  await chay(db);
  const truoc = thao_tac_thay_doi(db).length;
  for (let i = 0; i < 3; i += 1) {
    const kq = await chay(db);
    assert.deepEqual(kq.ke_hoach, []);
    assert.deepEqual(kq.da_chay, []);
    assert.equal(kq.da_hoan_tat, true);
  }
  assert.equal(thao_tac_thay_doi(db).length, truoc);
});

// ---------- nâng cấp từ cấu trúc Bước 1 ----------
test('Bước 1 → 2: phát hiện phiên bản 1 khi chưa có schema_version', async () => {
  const db = await tao_db_buoc_1();
  assert.equal((await doc_trang_thai(db)).hien_tai, 1);
});

test('Bước 1 → 2: chuyển tài khoản (giữ _id), cấu hình, giữ nguyên nhật ký, đổi tên bản cũ làm sao lưu', async () => {
  const db = await tao_db_buoc_1();
  const kq = await chay(db);
  assert.equal(kq.hien_tai, 1);
  assert.deepEqual(kq.da_chay, [2]);
  assert.equal(kq.da_hoan_tat, true);

  const nd = await db.collection('nguoi_dung').find({}).toArray();
  assert.equal(nd.length, 2);
  const admin = nd.find((x) => x.ten_dang_nhap === 'admin');
  const ketoan = nd.find((x) => x.ten_dang_nhap === 'ketoan');
  assert.deepEqual(admin._id, oid('a1'), 'giữ _id để token và nhật ký cũ vẫn khớp');
  assert.equal(admin.so_phien_token, 3);
  assert.equal(admin.khoa, false);
  assert.equal(ketoan.khoa, true);
  assert.deepEqual(ketoan.muc_duoc_xem, ['luong', 'lien_he']);
  for (const x of nd) assert.deepEqual(kiem_tra_validator(tao_validator('nguoi_dung'), x), [], x.ten_dang_nhap);

  assert.equal(db._cols.has('tai_khoan'), false);
  assert.equal((await db.collection('tai_khoan_v1_sao_luu').find({}).toArray()).length, 2, 'bản cũ còn nguyên để khôi phục');

  const ch = await db.collection('cau_hinh').findOne({ _id: 'he_thong' });
  assert.equal(ch.schema_version, 2);
  assert.equal(ch.phien_ban_toi_thieu, '0.3.0', 'không mất phiên bản tối thiểu đang dùng');
  assert.equal(ch.created_at.getTime(), T0.getTime());
  assert.deepEqual(kiem_tra_validator(tao_validator('cau_hinh'), ch), []);

  assert.equal((await db.collection('nhat_ky').find({}).toArray()).length, 1, 'nhật ký cũ giữ nguyên');
  assert.equal((await db.collection('luot_dang_nhap').find({}).toArray()).length, 1);
  assert.equal(chuan_json(db._cols.get('nhat_ky').options.validator), chuan_json(tao_validator('nhat_ky')), 'nhat_ky có validator sau nâng cấp');
  assert.equal(kq.vi_pham_du_lieu.nhat_ky, 0);
});

test('Bước 1 → 2: chạy lại sau khi xong là không làm gì (không chép lại, không đổi tên lần nữa)', async () => {
  const db = await tao_db_buoc_1();
  await chay(db);
  const truoc = thao_tac_thay_doi(db).length;
  const kq = await chay(db);
  assert.deepEqual(kq.da_chay, []);
  assert.equal(thao_tac_thay_doi(db).length, truoc);
  assert.equal((await db.collection('tai_khoan_v1_sao_luu').find({}).toArray()).length, 2);
});

test('Bước 1 → 2: bị ngắt giữa chừng (lỗi khi chép tài khoản) thì chạy lại là tiếp tục được, không mất dữ liệu', async () => {
  const db = await tao_db_buoc_1();
  db._tien_xu_ly.loi_khi_tao = { ten: 'nguoi_dung' };
  await assert.rejects(chay(db), /dừng giữa chừng[\s\S]*chạy lại/);
  assert.equal(db._cols.has('tai_khoan'), true, 'tai_khoan chưa bị đụng tới');
  assert.equal((await db.collection('tai_khoan').find({}).toArray()).length, 2);
  assert.equal((await doc_trang_thai(db)).hien_tai, 1, 'vẫn là phiên bản 1');
  const kq = await chay(db);
  assert.equal(kq.da_hoan_tat, true);
  assert.equal((await db.collection('nguoi_dung').find({}).toArray()).length, 2);
  assert.equal((await doc_trang_thai(db)).hien_tai, 2);
});

test('Bước 1 → 2: đã có tai_khoan_v1_sao_luu từ trước thì bản cũ được đổi sang tên có hậu tố thời gian', async () => {
  const db = await tao_db_buoc_1();
  await db.collection('tai_khoan_v1_sao_luu').insertOne({ _id: oid('x'), ghi_chu: 'bản sao lưu cũ' });
  const kq = await chay(db);
  assert.ok(kq.canh_bao.some((c) => /tai_khoan_v1_sao_luu/.test(c)));
  const ten = [...db._cols.keys()].filter((t) => t.startsWith('tai_khoan_v1_sao_luu'));
  assert.equal(ten.length, 2);
  assert.ok(ten.some((t) => /_\d{14}$/.test(t)));
});

// ---------- kiểm tra trước khi chạy ----------
test('kiểm tra trước: chỉ kiểm tra thì không thay đổi gì và vẫn liệt kê kế hoạch', async () => {
  const db = await tao_db_buoc_1();
  const truoc = db._thao_tac.length;
  const kq = await chay(db, { chi_kiem_tra: true });
  assert.equal(kq.da_hoan_tat, false);
  assert.deepEqual(kq.da_chay, []);
  assert.equal(kq.ke_hoach.length, 1);
  assert.equal(kq.ke_hoach[0].den, 2);
  assert.ok(kq.thong_tin.some((t) => /Sẽ chuyển 2 tài khoản/.test(t)));
  assert.equal(db._thao_tac.length, truoc);
  assert.equal(db._cols.has('nguoi_dung'), false);
});

test('kiểm tra trước: từ chối xác nhận thì không làm gì', async () => {
  const db = await tao_db_buoc_1();
  const truoc = db._thao_tac.length;
  const kq = await chay(db, { xac_nhan: async () => false });
  assert.equal(kq.da_huy, true);
  assert.equal(kq.da_hoan_tat, false);
  assert.equal(db._thao_tac.length, truoc);
});

test('kiểm tra trước: dữ liệu tài khoản cũ không chuyển được (tên sai, không phải bcrypt, loại lạ, 2 admin) → chặn, không đụng dữ liệu', async () => {
  const db = await tao_db_buoc_1({ them_tai_khoan_hong: true, hai_admin: true });
  const truoc = db._thao_tac.length;
  const kq = await chay(db);
  assert.equal(kq.da_hoan_tat, false);
  assert.ok(kq.loi.some((l) => /tên đăng nhập không hợp lệ/.test(l)));
  assert.ok(kq.loi.some((l) => /không phải bcrypt/.test(l)));
  assert.ok(kq.loi.some((l) => /loại tài khoản lạ/.test(l)));
  assert.ok(kq.loi.some((l) => /hơn một admin/.test(l)));
  assert.equal(db._thao_tac.length, truoc);
  assert.equal((await doc_trang_thai(db)).hien_tai, 1);
});

test('kiểm tra trước: CSDL mới hơn mã nguồn thì từ chối (không chạy ngược)', async () => {
  const db = tao_db_gia();
  await chay(db);
  await db.collection('cau_hinh').updateOne({ _id: 'he_thong' }, { $set: { schema_version: 3 } });
  const kq = await chay(db);
  assert.ok(kq.loi.some((l) => /MỚI HƠN/.test(l)));
  assert.equal(kq.da_hoan_tat, false);
});

test('kiểm tra trước: MongoDB quá cũ bị chặn', async () => {
  const kq = await chay(tao_db_gia({ phien_ban: [5, 0, 9] }));
  assert.ok(kq.loi.some((l) => /quá cũ/.test(l)));
  assert.equal(kq.da_hoan_tat, false);
});

test('kiểm tra trước: thiếu đặc quyền thì chặn và nói rõ thiếu gì; có dbOwner thì qua', async () => {
  const thieu = tao_db_gia({ dac_quyen: [{ resource: { db: CSDL, collection: '' }, actions: ['find', 'insert'] }] });
  const kq1 = await chay(thieu);
  assert.ok(kq1.loi.some((l) => /thiếu quyền[\s\S]*createCollection[\s\S]*collMod/.test(l)));
  assert.ok(kq1.thieu_quyen.includes('createIndex'));
  assert.equal(kq1.da_hoan_tat, false);
  const co_the_cap = tao_db_gia({ dac_quyen: [{ resource: { db: CSDL, collection: '' }, actions: ['find', 'grantRole'] }] });
  assert.equal((await chay(co_the_cap)).co_the_cap_quyen, true);
  const day_du = tao_db_gia({ dac_quyen: [{ resource: { db: CSDL, collection: '' }, actions: ['createCollection', 'collMod', 'createIndex', 'dropIndex', 'find', 'insert', 'update', 'remove', 'renameCollectionSameDB'] }] });
  const kq2 = await chay(day_du);
  assert.deepEqual(kq2.loi, []);
  assert.equal(kq2.da_hoan_tat, true);
});

test('dữ liệu có sẵn không đạt validator mới chỉ bị cảnh báo, không bị xóa hay chặn nâng cấp', async () => {
  const db = tao_db_gia();
  await db.collection('nhan_su').insertOne({ _id: oid('h1'), ma_nhan_vien: 'CU0001' }); // hồ sơ dở dang từ trước
  const kq = await chay(db);
  assert.equal(kq.da_hoan_tat, true);
  assert.ok(kq.canh_bao.some((c) => /nhan_su: 1 tài liệu/.test(c)));
  assert.equal(kq.vi_pham_du_lieu.nhan_su, 1);
  assert.equal((await db.collection('nhan_su').find({}).toArray()).length, 1);
});

test('kiểm tra trước: hai tài khoản cũ trùng tên đăng nhập → chặn (chỉ mục duy nhất của nguoi_dung sẽ không cho chép)', async () => {
  const db = await tao_db_buoc_1();
  await db.collection('tai_khoan').insertOne({ _id: oid('e5'), ten_dang_nhap: 'ketoan', mat_khau_bam: HASH, loai: 'xem_day_du', trang_thai: 'hoat_dong' });
  const truoc = db._thao_tac.length;
  const kq = await chay(db);
  assert.ok(kq.loi.some((l) => /trùng tên đăng nhập ketoan/.test(l)));
  assert.equal(kq.da_hoan_tat, false);
  assert.equal(db._thao_tac.length, truoc);
});
