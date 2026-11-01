'use strict';
/**
 * Kiểm thử tích hợp với MongoDB THẬT. Mặc định BỎ QUA. Đây là nơi duy nhất kiểm chứng validator, chỉ mục,
 * bộ nâng cấp và đặc quyền chạy đúng trên MongoDB thật (các test khác dùng CSDL giả).
 *
 * Chạy (user cần dbOwner/readWriteAnyDatabase + userAdmin, thường là user quản trị MongoDB trên máy thử):
 *   PowerShell:  $env:HRM_TEST_MONGO_URI = "mongodb://hrm_quan_tri_mongo:<mật_khẩu>@127.0.0.1:27017/?authSource=admin"
 *                npm test --workspace server
 * Mỗi lần chạy dùng một CSDL tạm hrm_test_<thời điểm> và xóa đi khi xong.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const URI = process.env.HRM_TEST_MONGO_URI;
const BO_QUA = URI ? false : 'Đặt HRM_TEST_MONGO_URI để chạy kiểm thử tích hợp MongoDB (xem đầu file)';

test('MongoDB thật: nâng cấp, validator, chỉ mục, nâng cấp từ Bước 1, đặc quyền', { skip: BO_QUA }, async (t) => {
  const { MongoClient, ObjectId } = require('mongodb');
  const S = require('@hrm/shared');
  const { nang_cap_csdl } = require('../src/csdl/nang_cap/chay');
  const { tao_dac_quyen, VAI_TRO_UNG_DUNG } = require('../src/kho/danh_sach_collection');
  const { tao_du_lieu_mau, thong_ke_du_lieu_mau } = require('../src/du_lieu_mau/tao_du_lieu_mau');
  const { kiem_tra_phien_ban_schema } = require('../src/csdl/cau_truc');

  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const csdl = `hrm_test_${Date.now()}`;
  const db = client.db(csdl);
  const HASH = `$2b$12$${'a'.repeat(53)}`;
  const ref = new Date(Date.UTC(2026, 9, 24));
  t.after(async () => {
    try { await client.db(csdl).command({ dropUser: 'nguoi_dung_thu' }); } catch { /* chưa tạo */ }
    try { await client.db(csdl).command({ dropRole: VAI_TRO_UNG_DUNG }); } catch { /* chưa tạo */ }
    await db.dropDatabase();
    await client.close();
  });

  await t.test('CSDL trống → nâng cấp lên phiên bản 2; chạy lại không còn bước nào', async () => {
    const kq = await nang_cap_csdl(db, csdl, {});
    assert.deepEqual(kq.loi, [], kq.loi.join('; '));
    assert.equal(kq.da_hoan_tat, true);
    assert.deepEqual(kq.da_chay, [2]);
    await kiem_tra_phien_ban_schema(db);
    const lan_2 = await nang_cap_csdl(db, csdl, {});
    assert.deepEqual(lan_2.da_chay, []);
    assert.equal(lan_2.da_hoan_tat, true);
    const ten = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
    assert.deepEqual(ten, ['cau_hinh', 'luot_dang_nhap', 'nghi_phep', 'nguoi_dung', 'nhan_su', 'nhat_ky']);
  });

  await t.test('MongoDB chấp nhận 200 hồ sơ mẫu + nghỉ phép mẫu (JSON Schema sinh tự động hợp lệ trên MongoDB thật)', async () => {
    const d = tao_du_lieu_mau({ so_luong: 200, ngay_tham_chieu: ref, tao_id: () => new ObjectId() });
    await db.collection('nhan_su').insertMany(d.nhan_su);
    await db.collection('nghi_phep').insertMany(d.nghi_phep);
    assert.equal(await db.collection('nhan_su').countDocuments({}), 200);
    // validator thật: không có hồ sơ nào hiện không đạt
    const kq = await nang_cap_csdl(db, csdl, {});
    assert.equal(kq.vi_pham_du_lieu.nhan_su, 0);
    assert.equal(kq.vi_pham_du_lieu.nghi_phep, 0);
  });

  await t.test('validator thật từ chối tài liệu sai (mã 121)', async () => {
    const co_121 = (e) => e.code === 121;
    await assert.rejects(db.collection('nhan_su').insertOne({ ma_nhan_vien: 'X' }), co_121);
    await assert.rejects(db.collection('nguoi_dung').insertOne({ ten_dang_nhap: 'a', mat_khau_bam: 'chu_ro' }), co_121);
    await assert.rejects(db.collection('nhat_ky').insertOne({ hanh_dong: 'dang_nhap' }), co_121);
    const mau = await db.collection('nghi_phep').findOne({});
    const { _id, ...phan_con_lai } = mau;
    await assert.rejects(db.collection('nghi_phep').insertOne({ ...phan_con_lai, den_ngay: new Date(mau.tu_ngay.getTime() - 86400000) }), co_121, 'den_ngay < tu_ngay phải bị từ chối');
    const h = await db.collection('nhan_su').findOne({});
    await assert.rejects(db.collection('nhan_su').updateOne({ _id: h._id }, { $set: { gioi_tinh: 'khac' } }), co_121);
    await assert.rejects(db.collection('nhan_su').updateOne({ _id: h._id }, { $set: { 'ngay_sinh.do_chinh_xac': 'nam' } }), co_121, 'do_chinh_xac phải khớp thành phần ngày');
  });

  await t.test('chỉ mục: mã nhân viên duy nhất, một admin, tên đăng nhập duy nhất, TTL', async () => {
    const h = await db.collection('nhan_su').findOne({});
    const { _id, ...ban_sao } = h;
    await assert.rejects(db.collection('nhan_su').insertOne({ ...ban_sao, _id: new ObjectId() }), (e) => e.code === 11000, 'trùng ma_nhan_vien');
    const nd = (ten, loai) => ({ ten_dang_nhap: ten, mat_khau_bam: HASH, loai, muc_duoc_xem: [], khoa: false, buoc_doi_mat_khau: false, so_lan_sai: 0, so_phien_token: 1, created_at: ref, updated_at: ref });
    await db.collection('nguoi_dung').insertOne(nd('admin', 'admin'));
    await assert.rejects(db.collection('nguoi_dung').insertOne(nd('admin2', 'admin')), (e) => e.code === 11000, 'chỉ một admin');
    await assert.rejects(db.collection('nguoi_dung').insertOne(nd('admin', 'xem_day_du')), (e) => e.code === 11000, 'trùng tên đăng nhập');
    await db.collection('nguoi_dung').insertOne(nd('xem1', 'xem_day_du'));
    const ttl = (await db.collection('luot_dang_nhap').indexes()).find((i) => i.name === 'tu_xoa_khi_het_han');
    assert.equal(ttl.expireAfterSeconds, 0);
  });

  await t.test('chỉ mục than_nhan.ngay_sinh dùng được: số hồ sơ có con dưới 6 tuổi khớp thống kê của bộ sinh', async () => {
    const d = {
      nhan_su: await db.collection('nhan_su').find({}).toArray(),
      nghi_phep: [],
    };
    const mong_doi = thong_ke_du_lieu_mau(d, ref).nhan_su_co_con_duoi_6;
    const moc = S.moc_sinh_cho_duoi_tuoi(6, ref);
    const loc = { than_nhan: { $elemMatch: { quan_he: 'con', 'ngay_sinh.ngay_chuan_hoa': { $gt: moc } } } };
    assert.equal(await db.collection('nhan_su').countDocuments(loc), mong_doi);
    const dung_chi_muc = await db.collection('nhan_su').find({ 'than_nhan.ngay_sinh.ngay_chuan_hoa': { $gt: moc } }).hint('than_nhan_ngay_sinh').toArray();
    assert.ok(dung_chi_muc.length >= mong_doi);
    const khen = await db.collection('nhan_su').find({ 'khen_thuong.thoi_diem.ngay_chuan_hoa': { $gte: new Date(Date.UTC(2025, 0, 1)) } }).hint('khen_thuong_thoi_diem').toArray();
    assert.ok(Array.isArray(khen));
    const tim = await db.collection('nhan_su').find({ tim_kiem: { $regex: '^nguyen' } }).hint('tim_kiem').toArray();
    assert.ok(tim.every((h) => h.tim_kiem.startsWith('nguyen')));
  });

  await t.test('projection theo mục: người chỉ có thong_tin_co_ban không nhận lương/kỷ luật/căn cước/thân nhân từ MongoDB', async () => {
    const proj = S.tao_projection(['thong_tin_co_ban']);
    const h = await db.collection('nhan_su').findOne({ ma_nhan_vien: 'MAU0004' }, { projection: proj });
    for (const khoa of ['luong', 'ky_luat', 'so_can_cuoc', 'than_nhan', 'so_dien_thoai', 'tim_kiem', 'khen_thuong']) assert.equal(khoa in h, false, khoa);
    assert.equal(h.ma_nhan_vien, 'MAU0004');
    const voi_than_nhan = await db.collection('nhan_su').findOne({ ma_nhan_vien: 'MAU0001' }, { projection: S.tao_projection(['thong_tin_co_ban', 'than_nhan']) });
    assert.ok(voi_than_nhan.than_nhan.length > 0);
    for (const tn of voi_than_nhan.than_nhan) for (const khoa of ['so_can_cuoc', 'tien_an', 'tim_kiem']) assert.equal(khoa in tn, false, khoa);
  });

  await t.test('đặc quyền thật: user ứng dụng ghi được dữ liệu nhưng nhat_ky chỉ thêm, không sửa/xóa, không đổi cấu trúc', async () => {
    await db.command({ createRole: VAI_TRO_UNG_DUNG, privileges: tao_dac_quyen(csdl), roles: [] });
    await db.command({ createUser: 'nguoi_dung_thu', pwd: 'mat-khau-thu-nghiem-123', roles: [{ role: VAI_TRO_UNG_DUNG, db: csdl }] });
    const u = new URL(URI);
    const app = new MongoClient(`mongodb://nguoi_dung_thu:mat-khau-thu-nghiem-123@${u.host}/?authSource=${csdl}`, { serverSelectionTimeoutMS: 5000 });
    await app.connect();
    try {
      const a = app.db(csdl);
      const khong_quyen = (e) => e.code === 13;
      await a.collection('nhat_ky').insertOne({ thoi_diem: ref, hanh_dong: 'dang_nhap', ket_qua: 'thanh_cong', may: { ten: null, ip: '127.0.0.1' } });
      assert.ok(await a.collection('nhat_ky').findOne({}));
      await assert.rejects(a.collection('nhat_ky').updateOne({}, { $set: { ket_qua: 'that_bai' } }), khong_quyen);
      await assert.rejects(a.collection('nhat_ky').deleteMany({}), khong_quyen);
      await assert.rejects(a.collection('nhat_ky').drop(), khong_quyen);
      await assert.rejects(a.collection('nhat_ky').createIndex({ hanh_dong: 1 }), khong_quyen);
      await assert.rejects(a.command({ collMod: 'nhat_ky', validator: {}, validationLevel: 'off' }), khong_quyen, 'không gỡ được validator');
      await assert.rejects(a.collection('nhan_su').dropIndex('ma_nhan_vien_duy_nhat'), khong_quyen);
      await assert.rejects(a.collection('cau_hinh').deleteOne({ _id: 'he_thong' }), khong_quyen);
      await assert.rejects(a.collection('nhan_su').insertOne({ ma_nhan_vien: 'X' }), (e) => e.code === 121, 'có quyền ghi nhưng validator vẫn chặn');
      const h = await a.collection('nhan_su').findOne({});
      await a.collection('nhan_su').updateOne({ _id: h._id }, { $set: { chuc_vu: 'Chức vụ thử', version: h.version + 1, updated_at: new Date() } });
      await a.collection('nguoi_dung').updateOne({ ten_dang_nhap: 'xem1' }, { $set: { so_lan_sai: 1 } });
      await assert.rejects(app.db('admin').collection('system.users').findOne({}), khong_quyen);
      await assert.rejects(app.db(`${csdl}_khac`).collection('x').insertOne({ a: 1 }), khong_quyen, 'không có quyền trên CSDL khác');
      assert.equal(await kiem_tra_phien_ban_schema(app.db(csdl)), 2, 'API đọc được cau_hinh và thấy đúng phiên bản');
    } finally { await app.close(); }
  });

  await t.test('nâng cấp từ cấu trúc Bước 1 trên MongoDB thật: giữ _id, đổi tên bản cũ, không mất nhật ký', async () => {
    const csdl_cu = `${csdl}_b1`;
    const cu = client.db(csdl_cu);
    try {
      const id_admin = new ObjectId();
      await cu.collection('tai_khoan').insertMany([
        { _id: id_admin, ten_dang_nhap: 'admin', mat_khau_bam: HASH, loai: 'admin', cac_muc_duoc_xem: [], trang_thai: 'hoat_dong', so_phien_token: 2, tao_luc: ref, sua_luc: ref },
        { _id: new ObjectId(), ten_dang_nhap: 'ketoan', mat_khau_bam: HASH, loai: 'xem_mot_so_muc', cac_muc_duoc_xem: ['luong'], trang_thai: 'khoa', so_phien_token: 1, tao_luc: ref, sua_luc: ref },
      ]);
      await cu.collection('cau_hinh').insertOne({ _id: 'he_thong', phien_ban_toi_thieu: '0.3.0', tao_luc: ref });
      await cu.collection('nhat_ky').insertOne({ thoi_diem: ref, hanh_dong: 'dang_nhap', ket_qua: 'thanh_cong', tai_khoan: { id: String(id_admin), ten: 'admin' }, may: { ten: 'MAY-01', ip: '192.168.1.21' }, phien_ban_ung_dung: '0.1.0' });
      const kq = await nang_cap_csdl(cu, csdl_cu, {});
      assert.deepEqual(kq.loi, [], kq.loi.join('; '));
      assert.equal(kq.hien_tai, 1);
      assert.equal(kq.da_hoan_tat, true);
      const admin = await cu.collection('nguoi_dung').findOne({ ten_dang_nhap: 'admin' });
      assert.ok(admin._id.equals(id_admin));
      assert.equal((await cu.collection('nguoi_dung').findOne({ ten_dang_nhap: 'ketoan' })).khoa, true);
      assert.equal(await cu.collection('tai_khoan_v1_sao_luu').countDocuments({}), 2);
      assert.equal(await cu.collection('nhat_ky').countDocuments({}), 1);
      assert.equal((await cu.collection('cau_hinh').findOne({ _id: 'he_thong' })).phien_ban_toi_thieu, '0.3.0');
      assert.deepEqual((await nang_cap_csdl(cu, csdl_cu, {})).da_chay, []);
    } finally { await cu.dropDatabase(); }
  });
});
