'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('@hrm/shared');
const { tao_du_lieu_mau, thong_ke_du_lieu_mau, NGAY_THAM_CHIEU_MAC_DINH } = require('../src/du_lieu_mau/tao_du_lieu_mau');
const { tao_json_schema } = require('../src/csdl/schema/tu_khai_bao');
const { kiem_tra_schema, kiem_tra_validator } = require('./ho_tro/kiem_tra_schema');
const { tao_validator } = require('../src/csdl/schema');

function tao_bo_dem_id() { let n = 0; return () => { n += 1; const id = n; return { _bsontype: 'ObjectId', id, toString: () => `oid${id}` }; }; }
const sinh = (hat = 20261024, so_luong = 200) => tao_du_lieu_mau({ so_luong, hat_giong: hat, tao_id: tao_bo_dem_id() });
const REF = NGAY_THAM_CHIEU_MAC_DINH;

test('200 hồ sơ nhân sự đều đạt JSON Schema của collection nhan_su', () => {
  const d = sinh();
  assert.equal(d.nhan_su.length, 200);
  const schema = tao_json_schema('nhan_su');
  for (const h of d.nhan_su) assert.deepEqual(kiem_tra_schema(schema, h), [], h.ma_nhan_vien);
});

test('mọi bản ghi nghỉ phép đạt validator nghi_phep (kể cả den_ngay ≥ tu_ngay) và trỏ tới hồ sơ có thật', () => {
  const d = sinh();
  const v = tao_validator('nghi_phep');
  const ma_id = new Set(d.nhan_su.map((h) => String(h._id)));
  assert.ok(d.nghi_phep.length > 100);
  for (const np of d.nghi_phep) {
    assert.deepEqual(kiem_tra_validator(v, np), [], JSON.stringify(np));
    assert.ok(ma_id.has(String(np.nhan_su_id)));
    const so_ngay_thuc = Math.round((np.den_ngay - np.tu_ngay) / 86400000) + 1;
    assert.equal(np.so_ngay, so_ngay_thuc);
  }
});

test('bộ mẫu đủ các tình huống cần thử', () => {
  const d = sinh();
  const tk = thong_ke_du_lieu_mau(d, REF);
  assert.equal(tk.tong_nhan_su, 200);
  assert.ok(tk.nhan_su_co_con_duoi_6 >= 30, `có con dưới 6 tuổi: ${tk.nhan_su_co_con_duoi_6}`);
  assert.ok(tk.ky_luat_con_hieu_luc >= 10, `kỷ luật còn hiệu lực: ${tk.ky_luat_con_hieu_luc}`);
  assert.ok(tk.ky_luat_het_hieu_luc >= 10, `kỷ luật hết hiệu lực: ${tk.ky_luat_het_hieu_luc}`);
  assert.ok(tk.ngay_chi_co_thang_nam > 100, 'có ngày chỉ có tháng/năm');
  assert.ok(tk.ngay_chi_co_nam > 20, 'có ngày chỉ có năm');
  assert.ok(tk.nhan_su_co_tien_an_tien_su >= 3);
});

test('ca sát ranh giới 6 tuổi: đúng 6 tuổi KHÔNG tính, sinh sau mốc 1 ngày thì tính', () => {
  const d = sinh();
  const moc = S.moc_sinh_cho_duoi_tuoi(6, REF);
  const con_cua = (i) => d.nhan_su[i].than_nhan.filter((t) => t.quan_he === 'con');
  const dung_6 = con_cua(10).find((t) => t.ngay_sinh.ngay_chuan_hoa.getTime() === moc.getTime());
  assert.ok(dung_6, 'hồ sơ #10 có con sinh đúng mốc');
  assert.equal(S.la_duoi_tuoi(dung_6.ngay_sinh, 6, REF), false);
  const sau_moc = con_cua(15).find((t) => t.ngay_sinh.ngay_chuan_hoa.getTime() === moc.getTime() + 86400000);
  assert.ok(sau_moc, 'hồ sơ #15 có con sinh sau mốc 1 ngày');
  assert.equal(S.la_duoi_tuoi(sau_moc.ngay_sinh, 6, REF), true);
});

test('con dưới 6 tuổi có cả dạng chỉ-có-năm, chỉ-có-tháng và đủ ngày; tính đúng theo ngày chuẩn hóa', () => {
  const d = sinh();
  const do_chinh_xac = new Set();
  for (const h of d.nhan_su) for (const t of h.than_nhan) if (t.quan_he === 'con' && S.la_duoi_tuoi(t.ngay_sinh, 6, REF)) do_chinh_xac.add(t.ngay_sinh.do_chinh_xac);
  assert.deepEqual([...do_chinh_xac].sort(), ['nam', 'ngay', 'thang']);
});

test('kỷ luật: còn hiệu lực gồm cả ca chưa ghi ngày hết; hết hiệu lực luôn có ngày trong quá khứ', () => {
  const d = sinh();
  const tat_ca = d.nhan_su.flatMap((h) => h.ky_luat || []);
  assert.ok(tat_ca.some((k) => k.het_hieu_luc === null && S.con_hieu_luc(k, REF)));
  for (const k of tat_ca.filter((x) => !S.con_hieu_luc(x, REF))) {
    assert.ok(k.het_hieu_luc && S.ngay_cuoi_ky(k.het_hieu_luc) < REF);
  }
  for (const k of tat_ca) assert.ok(k.thoi_diem.ngay_chuan_hoa <= REF, 'kỷ luật không nằm ở tương lai');
});

test('dữ liệu giả an toàn: mã MAU, căn cước bắt đầu 000, điện thoại 0000, cờ la_mau, không có số thật', () => {
  const d = sinh();
  const so_can_cuoc_bi_dung = new Set();
  for (const h of d.nhan_su) {
    assert.match(h.ma_nhan_vien, /^MAU\d{4}$/);
    assert.equal(h.la_mau, true);
    assert.match(h.so_can_cuoc, /^000\d{9}$/);
    assert.match(h.so_dien_thoai, /^0000\d{6}$/);
    assert.match(h.so_so_bhxh, /^MAU\d+$/);
    for (const t of h.than_nhan) if (t.so_can_cuoc) assert.match(t.so_can_cuoc, /^000\d{9}$/);
    so_can_cuoc_bi_dung.add(h.so_can_cuoc);
  }
  assert.equal(so_can_cuoc_bi_dung.size, 200, 'căn cước của nhân sự không trùng nhau');
  for (const np of d.nghi_phep) assert.equal(np.la_mau, true);
});

test('mã nhân viên duy nhất; tim_kiem khớp tên; id mọi phần tử mảng duy nhất toàn bộ', () => {
  const d = sinh();
  assert.equal(new Set(d.nhan_su.map((h) => h.ma_nhan_vien)).size, 200);
  const ids = new Set();
  for (const h of d.nhan_su) {
    assert.equal(h.tim_kiem, S.tao_tim_kiem_nhan_su(h));
    assert.ok(h.tim_kiem.includes(h.ma_nhan_vien.toLowerCase()));
    for (const ten of ['than_nhan', 'qua_trinh_cong_tac', 'dao_tao', 'luong', 'khen_thuong', 'ky_luat', 'tien_an_tien_su', 'qua_trinh_truoc_tuyen_dung']) {
      for (const p of h[ten] || []) { assert.ok(p.id, `${h.ma_nhan_vien}.${ten}.id`); assert.equal(ids.has(String(p.id)), false); ids.add(String(p.id)); }
    }
    for (const t of h.than_nhan) assert.equal(t.tim_kiem, S.chuan_hoa_tim_kiem(t.ho_ten));
  }
});

test('mỗi hồ sơ có đủ thân nhân cơ bản: cha, mẹ (của bản thân); có vợ/chồng thì có hồ sơ gia đình bên vợ/chồng nhất quán', () => {
  const d = sinh();
  let co_gia_dinh = 0;
  for (const h of d.nhan_su) {
    const q = (nhom, quan_he) => h.than_nhan.filter((t) => t.nhom === nhom && t.quan_he === quan_he);
    assert.equal(q('cua_ban_than', 'cha').length, 1);
    assert.equal(q('cua_ban_than', 'me').length, 1);
    const vc = [...q('cua_ban_than', 'vo'), ...q('cua_ban_than', 'chong')];
    assert.ok(vc.length <= 1);
    if (vc.length === 1) {
      co_gia_dinh += 1;
      assert.equal(vc[0].quan_he, h.gioi_tinh === 'nam' ? 'vo' : 'chong');
      assert.equal(vc[0].nam_ket_hon_ly_hon.tinh_trang, 'ket_hon');
    } else {
      assert.equal(h.than_nhan.filter((t) => t.nhom === 'cua_vo_chong').length, 0, 'chưa có vợ/chồng thì không có họ hàng bên vợ/chồng');
      assert.equal(h.than_nhan.filter((t) => t.quan_he === 'con').length, 0, 'mẫu: con chỉ có ở hồ sơ có vợ/chồng');
    }
  }
  assert.ok(co_gia_dinh > 120);
});

test('logic thời gian hợp lý: sinh trước tuyển dụng, quá trình công tác không chồng ngược, lương tăng dần, đúng một dòng hiện hành', () => {
  const d = sinh();
  for (const h of d.nhan_su) {
    const sinh_ngay = h.ngay_sinh.ngay_chuan_hoa;
    assert.ok(h.ngay_tuyen_dung_lan_dau.ngay_chuan_hoa > sinh_ngay, h.ma_nhan_vien);
    for (const dong of h.qua_trinh_cong_tac) if (dong.den) assert.ok(dong.den.ngay_chuan_hoa >= dong.tu.ngay_chuan_hoa, `${h.ma_nhan_vien} công tác`);
    for (const dong of h.dao_tao) if (dong.den) assert.ok(dong.den.ngay_chuan_hoa >= dong.tu.ngay_chuan_hoa, `${h.ma_nhan_vien} đào tạo`);
    const he_so = h.luong.map((l) => l.he_so_luong);
    assert.deepEqual([...he_so].sort((a, b) => a - b), he_so, `${h.ma_nhan_vien} lương không giảm`);
    assert.equal(h.luong.filter((l) => l.dang_dien_ra).length <= 1, true);
    if (h.trang_thai_nhan_su === 'dang_lam_viec') assert.equal(h.luong.at(-1).dang_dien_ra, true);
    for (const t of h.than_nhan) if (t.quan_he === 'con') assert.ok(t.ngay_sinh.ngay_chuan_hoa <= REF, 'con không sinh ở tương lai');
    for (const t of h.than_nhan) if (t.quan_he === 'cha' || t.quan_he === 'me') if (t.nhom === 'cua_ban_than') assert.ok(t.ngay_sinh.ngay_chuan_hoa < sinh_ngay);
  }
});

test('không có giá trị undefined trong tài liệu (driver sẽ lưu thành null)', () => {
  const d = sinh();
  const quet = (x, duong_dan) => {
    if (x === undefined) assert.fail(`undefined tại ${duong_dan}`);
    if (Array.isArray(x)) x.forEach((p, i) => quet(p, `${duong_dan}[${i}]`));
    else if (x && typeof x === 'object' && !(x instanceof Date) && x._bsontype !== 'ObjectId') for (const [k, v] of Object.entries(x)) quet(v, `${duong_dan}.${k}`);
  };
  d.nhan_su.forEach((h, i) => quet(h, `nhan_su[${i}]`));
  d.nghi_phep.forEach((h, i) => quet(h, `nghi_phep[${i}]`));
});

test('chuẩn hóa lại bộ mẫu không đổi gì (bộ sinh đã sinh dữ liệu ở dạng chuẩn)', () => {
  const d = sinh(7, 30);
  for (const h of d.nhan_su) assert.deepEqual(S.chuan_hoa_nhan_su(h), h);
});

test('cùng seed → cùng dữ liệu; khác seed → khác; số lượng tùy chỉnh', () => {
  const chuoi = (x) => JSON.stringify(x, (k, v) => (v && v._bsontype === 'ObjectId' ? `id${v.id}` : v));
  assert.equal(chuoi(sinh(5, 20)), chuoi(sinh(5, 20)));
  assert.notEqual(chuoi(sinh(5, 20)), chuoi(sinh(6, 20)));
  assert.equal(sinh(1, 7).nhan_su.length, 7);
  assert.throws(() => tao_du_lieu_mau({ so_luong: 1 }), /tao_id/);
});

test('phân quyền trên dữ liệu mẫu: người chỉ có thong_tin_co_ban không thấy lương, kỷ luật, căn cước, thân nhân', () => {
  const d = sinh(3, 20);
  for (const h of d.nhan_su) {
    const nhin = S.loc_tai_lieu_theo_muc('nhan_su', h, ['thong_tin_co_ban']);
    for (const t of ['luong', 'ky_luat', 'tien_an_tien_su', 'so_can_cuoc', 'than_nhan', 'so_dien_thoai', 'khen_thuong', 'tim_kiem']) assert.equal(t in nhin, false, t);
    assert.equal(nhin.ma_nhan_vien, h.ma_nhan_vien);
    const voi_than_nhan = S.loc_tai_lieu_theo_muc('nhan_su', h, ['thong_tin_co_ban', 'than_nhan']);
    for (const t of voi_than_nhan.than_nhan) { assert.equal('so_can_cuoc' in t, false); assert.equal('tien_an' in t, false); assert.equal('tim_kiem' in t, false); }
  }
});
