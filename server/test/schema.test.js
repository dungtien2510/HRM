'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('@hrm/shared');
const { tao_json_schema } = require('../src/csdl/schema/tu_khai_bao');
const { tao_validator } = require('../src/csdl/schema');
const { kiem_tra_schema } = require('./ho_tro/kiem_tra_schema');
const { tao_moi_truong, them_tai_khoan, thu_dang_nhap } = require('./ho_tro/gia');

const oid = (n = 1) => ({ _bsontype: 'ObjectId', id: n, toString: () => `oid${n}` });
const ngay_day_du = (nam, thang, ngay) => ({ nam, thang, ngay, ngay_chuan_hoa: new Date(Date.UTC(nam, thang - 1, ngay)), do_chinh_xac: 'ngay' });
const HASH = `$2b$12$${'a'.repeat(53)}`;

/** Hồ sơ nhân sự tối thiểu hợp lệ (chỉ các trường bắt buộc ở mức CSDL). */
function ho_so_toi_thieu() {
  const bay_gio = new Date(Date.UTC(2026, 9, 24));
  return {
    _id: oid(1), version: 1, created_at: bay_gio, updated_at: bay_gio,
    ma_nhan_vien: 'MAU0001', ho_ten_khai_sinh: 'Nguyễn Văn An', ngay_sinh: ngay_day_du(1990, 5, 6), gioi_tinh: 'nam',
    bo_phan: 'Kho vận', trang_thai_nhan_su: 'dang_lam_viec', tim_kiem: 'nguyen van an mau0001',
  };
}
const hop_le = (collection, doc) => kiem_tra_schema(tao_json_schema(collection), doc);

test('schema nhan_su: hồ sơ tối thiểu hợp lệ', () => {
  assert.deepEqual(hop_le('nhan_su', ho_so_toi_thieu()), []);
});

test('schema nhan_su: khớp 1-1 với bảng khai báo (thuộc tính và trường bắt buộc, kể cả trong mảng)', () => {
  const schema = tao_json_schema('nhan_su');
  const kb = S.BANG_TRUONG.nhan_su.truong;
  assert.deepEqual(Object.keys(schema.properties).sort(), Object.keys(kb).sort());
  const bat_buoc = (truong) => Object.entries(truong).filter(([, k]) => k.bb === 'csdl').map(([t]) => t).sort();
  assert.deepEqual([...schema.required].sort(), bat_buoc(kb));
  for (const [ten, k] of Object.entries(kb)) {
    if (k.kieu !== 'mang') continue;
    const items = schema.properties[ten].items;
    assert.equal(schema.properties[ten].bsonType, 'array', ten);
    assert.deepEqual(Object.keys(items.properties).sort(), Object.keys(k.truong).sort(), `phần tử của ${ten}`);
    assert.deepEqual([...(items.required || [])].sort(), bat_buoc(k.truong), `bắt buộc của ${ten}`);
    assert.equal(items.additionalProperties, false);
  }
  assert.equal(schema.additionalProperties, false);
});

test('schema nhan_su: từng trường bắt buộc bị thiếu đều bị từ chối', () => {
  const schema = tao_json_schema('nhan_su');
  for (const t of schema.required) {
    const doc = ho_so_toi_thieu(); delete doc[t];
    assert.ok(kiem_tra_schema(schema, doc).some((l) => l.includes(`thiếu trường bắt buộc ${t}`)), t);
  }
});

test('schema nhan_su: trường lạ, enum sai, kiểu sai, mã nhân viên sai định dạng bị từ chối', () => {
  const thu = (ghi_de) => hop_le('nhan_su', { ...ho_so_toi_thieu(), ...ghi_de });
  assert.ok(thu({ truong_la: 1 }).length > 0);
  assert.ok(thu({ gioi_tinh: 'khac' }).length > 0);
  assert.ok(thu({ trang_thai_nhan_su: 'dang_nghi' }).length > 0);
  assert.ok(thu({ ma_nhan_vien: 'ab' }).length > 0);
  assert.ok(thu({ ma_nhan_vien: 'co khoang trang' }).length > 0);
  assert.ok(thu({ version: 0 }).length > 0);
  assert.ok(thu({ version: '1' }).length > 0);
  assert.ok(thu({ created_at: '2026-10-24' }).length > 0, 'ngày phải là kiểu date');
  assert.ok(thu({ bo_phan: null }).length > 0, 'trường bắt buộc không cho null');
  assert.ok(thu({ ten_goi_khac: '' }).length > 0, 'không lưu chuỗi rỗng');
  assert.ok(thu({ so_dien_thoai: 'abc' }).length > 0);
  assert.deepEqual(thu({ ten_goi_khac: null, so_dien_thoai: '0000000001', chuc_vu: 'Tổ trưởng' }), [], 'trường tùy chọn cho phép null');
});

test('schema nhan_su: ngày không đủ — ba dạng hợp lệ, dạng mâu thuẫn bị từ chối', () => {
  const voi = (v) => hop_le('nhan_su', { ...ho_so_toi_thieu(), ngay_vao_dang: v });
  assert.deepEqual(voi(S.chuan_hoa_ngay_kdd({ nam: 2016, thang: 9, ngay: 5 })), []);
  assert.deepEqual(voi(S.chuan_hoa_ngay_kdd({ nam: 2024, thang: 11 })), []);
  assert.deepEqual(voi(S.chuan_hoa_ngay_kdd({ nam: 2016 })), []);
  assert.deepEqual(voi(null), []);
  const thang = S.chuan_hoa_ngay_kdd({ nam: 2024, thang: 11 });
  assert.ok(voi({ ...thang, do_chinh_xac: 'ngay' }).length > 0, 'nói là ngày nhưng không có ngay');
  assert.ok(voi({ ...thang, ngay: 5, do_chinh_xac: 'thang' }).length > 0, 'nói là tháng nhưng có ngay');
  assert.ok(voi({ nam: 2024, thang: 11 }).length > 0, 'thiếu ngay_chuan_hoa');
  assert.ok(voi({ ...thang, thang: 13 }).length > 0);
  assert.ok(voi({ ...thang, nam: 1800 }).length > 0);
  assert.ok(voi({ ...thang, ngay_chuan_hoa: '2024-11-01' }).length > 0);
  assert.ok(voi({ ...thang, du_thua: 1 }).length > 0);
  assert.ok(hop_le('nhan_su', { ...ho_so_toi_thieu(), ngay_sinh: null }).length > 0, 'ngày sinh bắt buộc, không cho null');
});

test('schema nhan_su: địa chỉ, co_mo_ta, kết hôn', () => {
  const voi = (ghi_de) => hop_le('nhan_su', { ...ho_so_toi_thieu(), ...ghi_de });
  assert.deepEqual(voi({ que_quan: { so_nha_duong: null, xa_phuong: 'Xã A', tinh_tp: 'Huế', van_ban_goc: 'Xã A, Huế' } }), []);
  assert.ok(voi({ que_quan: { xa_phuong: 'Xã A' } }).length > 0, 'thiếu van_ban_goc');
  assert.ok(voi({ que_quan: { van_ban_goc: '' } }).length > 0);
  assert.deepEqual(voi({ co_yeu_to_nuoc_ngoai: { co: false, mo_ta: null } }), []);
  assert.ok(voi({ co_yeu_to_nuoc_ngoai: { mo_ta: 'x' } }).length > 0);
  assert.deepEqual(voi({ than_nhan: [{ id: oid(2), nhom: 'cua_ban_than', quan_he: 'vo', ho_ten: 'B', tim_kiem: 'b', nam_ket_hon_ly_hon: { tinh_trang: 'ket_hon', nam: 2015 } }] }), []);
  assert.ok(voi({ than_nhan: [{ id: oid(2), nhom: 'cua_ban_than', quan_he: 'vo', ho_ten: 'B', tim_kiem: 'b', nam_ket_hon_ly_hon: { tinh_trang: 'ket_hon' } }] }).length > 0);
});

test('schema nhan_su: mảng nhúng — thiếu id/nhom/quan_he/ho_ten, nhom sai, quá giới hạn phần tử', () => {
  const tn = (p) => ({ ...ho_so_toi_thieu(), than_nhan: [p] });
  const tot = { id: oid(2), nhom: 'cua_vo_chong', quan_he: 'me', ho_ten: 'Trần Thị B', ngay_sinh: ngay_day_du(1960, 1, 2), tim_kiem: 'tran thi b' };
  assert.deepEqual(hop_le('nhan_su', tn(tot)), []);
  for (const t of ['id', 'nhom', 'quan_he', 'ho_ten', 'tim_kiem']) {
    const p = { ...tot }; delete p[t];
    assert.ok(hop_le('nhan_su', tn(p)).length > 0, t);
  }
  assert.ok(hop_le('nhan_su', tn({ ...tot, nhom: 'ben_ngoai' })).length > 0);
  assert.ok(hop_le('nhan_su', tn({ ...tot, quan_he: 'ban' })).length > 0);
  assert.ok(hop_le('nhan_su', tn({ ...tot, truong_la: 1 })).length > 0);
  const nhieu = { ...ho_so_toi_thieu(), than_nhan: Array.from({ length: 61 }, (_, i) => ({ ...tot, id: oid(i + 10) })) };
  assert.ok(hop_le('nhan_su', nhieu).length > 0);
  assert.ok(hop_le('nhan_su', { ...ho_so_toi_thieu(), than_nhan: null }).length > 0, 'mảng không cho null');
});

test('schema nhan_su: kỷ luật có het_hieu_luc null, lương có he_so_luong bắt buộc và không âm', () => {
  const kl = { id: oid(3), loai: 'dang', thoi_diem: ngay_day_du(2026, 3, 1), het_hieu_luc: null, hinh_thuc: 'Khiển trách' };
  assert.deepEqual(hop_le('nhan_su', { ...ho_so_toi_thieu(), ky_luat: [kl] }), []);
  assert.ok(hop_le('nhan_su', { ...ho_so_toi_thieu(), ky_luat: [{ ...kl, loai: 'khac' }] }).length > 0);
  const luong = { id: oid(4), tu: S.chuan_hoa_ngay_kdd({ nam: 2020, thang: 7 }), den: null, dang_dien_ra: true, he_so_luong: 3.33 };
  assert.deepEqual(hop_le('nhan_su', { ...ho_so_toi_thieu(), luong: [luong] }), []);
  assert.ok(hop_le('nhan_su', { ...ho_so_toi_thieu(), luong: [{ ...luong, he_so_luong: -1 }] }).length > 0);
  const khong_he_so = { ...luong }; delete khong_he_so.he_so_luong;
  assert.ok(hop_le('nhan_su', { ...ho_so_toi_thieu(), luong: [khong_he_so] }).length > 0);
});

test('schema nghi_phep: hợp lệ, thiếu trường, loại phép sai; validator có ràng buộc den_ngay ≥ tu_ngay', () => {
  const np = { _id: oid(5), nhan_su_id: oid(1), tu_ngay: new Date(Date.UTC(2026, 9, 5)), den_ngay: new Date(Date.UTC(2026, 9, 7)), loai_phep: 'phep_nam', so_ngay: 3, created_at: new Date(), updated_at: new Date() };
  assert.deepEqual(hop_le('nghi_phep', np), []);
  for (const t of ['nhan_su_id', 'tu_ngay', 'den_ngay', 'loai_phep', 'created_at', 'updated_at']) { const x = { ...np }; delete x[t]; assert.ok(hop_le('nghi_phep', x).length > 0, t); }
  assert.ok(hop_le('nghi_phep', { ...np, loai_phep: 'nghi_dai' }).length > 0);
  assert.ok(hop_le('nghi_phep', { ...np, nhan_su_id: 'chuoi' }).length > 0);
  const v = tao_validator('nghi_phep');
  assert.deepEqual(v.$and[1], { $expr: { $gte: ['$den_ngay', '$tu_ngay'] } });
});

test('schema nguoi_dung: hợp lệ; mật khẩu không phải bcrypt, tên viết hoa, loại lạ, mục lạ, số âm đều bị từ chối', () => {
  const nd = { _id: oid(6), ten_dang_nhap: 'admin', ten_hien_thi: 'Quản trị', mat_khau_bam: HASH, loai: 'admin', muc_duoc_xem: [], khoa: false, buoc_doi_mat_khau: false, so_lan_sai: 0, so_phien_token: 1, created_at: new Date(), updated_at: new Date() };
  const sch = tao_validator('nguoi_dung').$jsonSchema;
  assert.deepEqual(kiem_tra_schema(sch, nd), []);
  const sai = (ghi_de) => kiem_tra_schema(sch, { ...nd, ...ghi_de }).length > 0;
  assert.ok(sai({ mat_khau_bam: 'matkhau_chu_ro' }));
  assert.ok(sai({ mat_khau_bam: 'bam:xyz' }));
  assert.ok(sai({ ten_dang_nhap: 'Admin' }));
  assert.ok(sai({ ten_dang_nhap: 'ab' }));
  assert.ok(sai({ loai: 'sieu_quan_tri' }));
  assert.ok(sai({ muc_duoc_xem: ['khong_co'] }));
  assert.ok(sai({ muc_duoc_xem: ['luong', 'luong'] }), 'trùng mục');
  assert.ok(sai({ so_lan_sai: -1 }));
  assert.ok(sai({ so_phien_token: 0 }));
  assert.ok(sai({ khoa: 'khong' }));
  assert.ok(sai({ cac_muc_duoc_xem: [] }), 'tên trường cũ của Bước 1 không còn hợp lệ');
  for (const t of sch.required) { const x = { ...nd }; delete x[t]; assert.ok(kiem_tra_schema(sch, x).length > 0, t); }
  assert.deepEqual(kiem_tra_schema(sch, { ...nd, muc_duoc_xem: ['luong', 'lien_he'], loai: 'xem_mot_so_muc', la_mau: true, lan_sai_cuoi: new Date(), dang_nhap_cuoi: null }), []);
});

test('schema nhat_ky: bản ghi do dịch vụ đăng nhập của Bước 1 tạo ra (thành công, thất bại, bị khóa, tên lạ) đều hợp lệ', async () => {
  const { dich_vu, kho } = tao_moi_truong();
  await them_tai_khoan(kho, 'admin', 'MatKhauBiMat-123');
  await thu_dang_nhap(dich_vu, 'admin', 'MatKhauBiMat-123');
  await thu_dang_nhap(dich_vu, 'admin', 'sai').catch(() => {});
  await thu_dang_nhap(dich_vu, 'nguoi_la', 'sai').catch(() => {});
  for (let i = 0; i < 6; i += 1) await thu_dang_nhap(dich_vu, 'admin', 'sai').catch(() => {});
  const sch = tao_validator('nhat_ky').$jsonSchema;
  const ds = kho._du_lieu.nhat_ky;
  assert.ok(ds.length >= 9);
  assert.ok(ds.some((d) => d.ket_qua === 'tu_choi') && ds.some((d) => d.ket_qua === 'that_bai') && ds.some((d) => d.ket_qua === 'thanh_cong'));
  for (const d of ds) assert.deepEqual(kiem_tra_schema(sch, d), [], JSON.stringify(d));
});

test('schema nhat_ky: bản ghi sai bị từ chối', () => {
  const sch = tao_validator('nhat_ky').$jsonSchema;
  const tot = { thoi_diem: new Date(), hanh_dong: 'dang_nhap', ket_qua: 'thanh_cong', tai_khoan: { id: 'x', ten: 'admin' }, may: { ten: 'MAY-01', ip: '192.168.1.21' }, phien_ban_ung_dung: '0.1.0', chi_tiet: null };
  assert.deepEqual(kiem_tra_schema(sch, tot), []);
  for (const t of ['thoi_diem', 'hanh_dong', 'ket_qua', 'may']) { const x = { ...tot }; delete x[t]; assert.ok(kiem_tra_schema(sch, x).length > 0, t); }
  assert.ok(kiem_tra_schema(sch, { ...tot, ket_qua: 'xong' }).length > 0);
  assert.ok(kiem_tra_schema(sch, { ...tot, hanh_dong: 'DANG NHAP' }).length > 0);
  assert.ok(kiem_tra_schema(sch, { ...tot, may: { ten: 'M' } }).length > 0);
  assert.ok(kiem_tra_schema(sch, { ...tot, mat_khau: 'x' }).length > 0, 'trường lạ');
  const dai_nhat = `999999.999999.999999-${'a'.repeat(32)}`;
  assert.equal(S.phan_tich_phien_ban(dai_nhat) !== null, true);
  assert.deepEqual(kiem_tra_schema(sch, { ...tot, phien_ban_ung_dung: dai_nhat }), [], 'chuỗi phiên bản dài nhất hợp lệ vẫn ghi được nhật ký');
});

test('schema cau_hinh: hợp lệ, _id chỉ là he_thong, giờ sao lưu đúng định dạng, thiếu trường bị từ chối', () => {
  const sch = tao_validator('cau_hinh').$jsonSchema;
  const ch = { _id: 'he_thong', ten_don_vi: 'Đơn vị A', schema_version: 2, phien_ban_toi_thieu: '0.1.0', cai_dat_sao_luu: { bat: true, thu_muc: 'D:\\sao_luu', gio: '02:30', giu_toi_da_ban: 14, lan_cuoi: null }, created_at: new Date(), updated_at: new Date() };
  assert.deepEqual(kiem_tra_schema(sch, ch), []);
  assert.ok(kiem_tra_schema(sch, { ...ch, _id: 'khac' }).length > 0);
  assert.ok(kiem_tra_schema(sch, { ...ch, phien_ban_toi_thieu: 'abc' }).length > 0);
  assert.ok(kiem_tra_schema(sch, { ...ch, cai_dat_sao_luu: { ...ch.cai_dat_sao_luu, gio: '25:61' } }).length > 0);
  assert.ok(kiem_tra_schema(sch, { ...ch, schema_version: -1 }).length > 0);
  for (const t of ['ten_don_vi', 'schema_version', 'phien_ban_toi_thieu', 'cai_dat_sao_luu']) { const x = { ...ch }; delete x[t]; assert.ok(kiem_tra_schema(sch, x).length > 0, t); }
});

test('tao_validator: đủ cho cả 6 collection; collection lạ bị từ chối', () => {
  for (const c of ['nhan_su', 'nghi_phep', 'nguoi_dung', 'nhat_ky', 'cau_hinh', 'luot_dang_nhap']) assert.ok(tao_validator(c), c);
  assert.throws(() => tao_validator('khong_co'), /Chưa có validator/);
});

test('validator chỉ dùng từ khóa MongoDB hỗ trợ (không $ref, format, default, integer, $schema)', () => {
  const cam = new Set(['$ref', 'format', 'default', '$schema', 'definitions', '$defs']);
  const quet = (x, duong_dan) => {
    if (Array.isArray(x)) { x.forEach((p, i) => quet(p, `${duong_dan}[${i}]`)); return; }
    if (x && typeof x === 'object' && !(x instanceof Date)) {
      for (const [k, v] of Object.entries(x)) {
        // Tên thuộc tính dữ liệu (nằm dưới "properties") có thể trùng từ khóa, chỉ kiểm khóa của schema:
        if (duong_dan.endsWith('.properties')) quet(v, `${duong_dan}.${k}`);
        else { assert.equal(cam.has(k), false, `${duong_dan}.${k}`); assert.notEqual(v, 'integer', `${duong_dan}.${k}`); quet(v, `${duong_dan}.${k}`); }
      }
    }
  };
  for (const c of ['nhan_su', 'nghi_phep', 'nguoi_dung', 'nhat_ky', 'cau_hinh', 'luot_dang_nhap']) quet(tao_validator(c), c);
});
