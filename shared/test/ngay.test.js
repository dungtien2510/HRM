'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/index.js');

const utc = (n, t, d) => new Date(Date.UTC(n, t - 1, d));

test('chuan_hoa_ngay_kdd: đủ ngày, chỉ tháng/năm, chỉ năm', () => {
  const day_du = S.chuan_hoa_ngay_kdd({ nam: 2016, thang: 9, ngay: 5 });
  assert.deepEqual(day_du, { nam: 2016, thang: 9, ngay: 5, ngay_chuan_hoa: utc(2016, 9, 5), do_chinh_xac: 'ngay' });
  const thang = S.chuan_hoa_ngay_kdd({ nam: 2024, thang: 11 });
  assert.deepEqual(thang, { nam: 2024, thang: 11, ngay_chuan_hoa: utc(2024, 11, 1), do_chinh_xac: 'thang' });
  const nam = S.chuan_hoa_ngay_kdd({ nam: 2016 });
  assert.deepEqual(nam, { nam: 2016, ngay_chuan_hoa: utc(2016, 1, 1), do_chinh_xac: 'nam' });
  assert.equal('thang' in nam, false);
});

test('chuan_hoa_ngay_kdd: chấp nhận null cho thang/ngay, bỏ giá trị dư và tính lại ngày chuẩn hóa', () => {
  const kq = S.chuan_hoa_ngay_kdd({ nam: 2020, thang: null, ngay: null, ngay_chuan_hoa: 'sai', do_chinh_xac: 'ngay' });
  assert.deepEqual(kq, { nam: 2020, ngay_chuan_hoa: utc(2020, 1, 1), do_chinh_xac: 'nam' });
});

test('chuan_hoa_ngay_kdd: từ chối giá trị sai', () => {
  const sai = [
    { nam: 1899 }, { nam: 2101 }, { nam: 2020.5 }, { nam: '2020' }, {}, null, 'x',
    { nam: 2020, thang: 0 }, { nam: 2020, thang: 13 }, { nam: 2020, thang: 1.5 },
    { nam: 2020, ngay: 5 },
    { nam: 2021, thang: 2, ngay: 29 }, { nam: 2021, thang: 4, ngay: 31 }, { nam: 2020, thang: 1, ngay: 0 },
  ];
  for (const x of sai) assert.throws(() => S.chuan_hoa_ngay_kdd(x), RangeError, JSON.stringify(x));
  assert.doesNotThrow(() => S.chuan_hoa_ngay_kdd({ nam: 2020, thang: 2, ngay: 29 }), 'năm nhuận');
});

test('tu_chuoi_ngay hiểu các cách gõ trong file mẫu', () => {
  assert.equal(S.tu_chuoi_ngay('07/1/1968').ngay_chuan_hoa.toISOString(), '1968-01-07T00:00:00.000Z');
  assert.equal(S.tu_chuoi_ngay('2/4/2025').do_chinh_xac, 'ngay');
  assert.equal(S.tu_chuoi_ngay('11/2024').do_chinh_xac, 'thang');
  assert.equal(S.tu_chuoi_ngay(' 2016 ').do_chinh_xac, 'nam');
  for (const x of ['', '31/2/2020', '13/2020', 'abc', '1/2/3']) assert.throws(() => S.tu_chuoi_ngay(x), RangeError, x);
});

test('ngay_cuoi_ky', () => {
  assert.deepEqual(S.ngay_cuoi_ky(S.chuan_hoa_ngay_kdd({ nam: 2024, thang: 2 })), utc(2024, 2, 29));
  assert.deepEqual(S.ngay_cuoi_ky(S.chuan_hoa_ngay_kdd({ nam: 2023 })), utc(2023, 12, 31));
  assert.deepEqual(S.ngay_cuoi_ky(S.chuan_hoa_ngay_kdd({ nam: 2023, thang: 5, ngay: 7 })), utc(2023, 5, 7));
});

test('tuoi_tai và la_duoi_tuoi (ngày tham chiếu 18/10/2026)', () => {
  const ref = utc(2026, 10, 18);
  const sinh = (n, t, d) => S.chuan_hoa_ngay_kdd({ nam: n, thang: t, ngay: d });
  assert.equal(S.tuoi_tai(sinh(2020, 10, 18), ref), 6, 'đúng sinh nhật');
  assert.equal(S.tuoi_tai(sinh(2020, 10, 19), ref), 5, 'chưa đến sinh nhật');
  assert.equal(S.la_duoi_tuoi(sinh(2020, 10, 19), 6, ref), true);
  assert.equal(S.la_duoi_tuoi(sinh(2020, 10, 18), 6, ref), false, 'tròn 6 tuổi không còn là dưới 6');
  assert.equal(S.la_duoi_tuoi(sinh(2025, 4, 2), 6, ref), true);
  assert.equal(S.la_duoi_tuoi(S.chuan_hoa_ngay_kdd({ nam: 2021 }), 6, ref), true, 'chỉ có năm 2021 → tính từ 01/01/2021');
  assert.equal(S.moc_sinh_cho_duoi_tuoi(6, ref).toISOString(), '2020-10-18T00:00:00.000Z');
});

test('con_hieu_luc của kỷ luật', () => {
  const ref = utc(2026, 10, 18);
  const kdd = (n, t, d) => S.chuan_hoa_ngay_kdd({ nam: n, thang: t, ngay: d });
  assert.equal(S.con_hieu_luc({ het_hieu_luc: null }, ref), true, 'chưa ghi ngày hết hiệu lực → còn');
  assert.equal(S.con_hieu_luc({}, ref), true);
  assert.equal(S.con_hieu_luc({ het_hieu_luc: kdd(2026, 10, 17) }, ref), false);
  assert.equal(S.con_hieu_luc({ het_hieu_luc: kdd(2026, 10, 18) }, ref), true, 'còn đến hết ngày ghi');
  assert.equal(S.con_hieu_luc({ het_hieu_luc: S.chuan_hoa_ngay_kdd({ nam: 2026, thang: 10 }) }, ref), true, 'chỉ có tháng → còn đến cuối tháng');
  assert.equal(S.con_hieu_luc({ het_hieu_luc: S.chuan_hoa_ngay_kdd({ nam: 2026, thang: 9 }) }, ref), false);
  assert.equal(S.con_hieu_luc({ het_hieu_luc: S.chuan_hoa_ngay_kdd({ nam: 2025 }) }, ref), false);
});
