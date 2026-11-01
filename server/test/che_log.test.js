'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { che, che_chuoi, tao_log, MAT_NA } = require('../src/tien_ich/che_log');

const JWT_MAU = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJlMTIz';

test('che khóa nhạy cảm theo tên, kể cả lồng nhau và trong mảng', () => {
  const kq = che({
    ten_dang_nhap: 'an',
    mat_khau: 'abc', mat_khau_bam: 'x', token: 't', Authorization: 'Bearer abc',
    so_can_cuoc: '012345678901', cccd: '1',
    long: { jwt_bi_mat: 's', ok: 1, ds: [{ password: 'p', ten: 'b' }] },
  });
  assert.equal(kq.ten_dang_nhap, 'an');
  for (const k of ['mat_khau', 'mat_khau_bam', 'token', 'Authorization', 'so_can_cuoc', 'cccd']) assert.equal(kq[k], MAT_NA, k);
  assert.equal(kq.long.jwt_bi_mat, MAT_NA);
  assert.equal(kq.long.ok, 1);
  assert.equal(kq.long.ds[0].password, MAT_NA);
  assert.equal(kq.long.ds[0].ten, 'b');
});

test('che_chuoi che JWT, Bearer và số 9–12 chữ số', () => {
  const kq = che_chuoi(`lỗi với ${JWT_MAU} và Bearer abc.def số 012345678901 mã 1234`);
  assert.equal(kq.includes('eyJ'), false);
  assert.equal(kq.includes('abc.def'), false);
  assert.equal(kq.includes('012345678901'), false);
  assert.ok(kq.includes('1234'), 'số ngắn được giữ nguyên');
});

test('che Error: chỉ giữ tên, thông điệp đã che và mã; không có stack', () => {
  const loi = Object.assign(new Error(`Hỏng với ${JWT_MAU}`), { code: 'E1' });
  const kq = che({ loi });
  assert.equal(kq.loi.ten, 'Error');
  assert.equal(kq.loi.ma, 'E1');
  assert.equal(kq.loi.thong_diep.includes('eyJ'), false);
  assert.equal('stack' in kq.loi, false);
});

test('che không đổi dữ liệu gốc và chịu được vòng quá sâu', () => {
  const goc = { mat_khau: 'a', con: { mat_khau: 'b' } };
  che(goc);
  assert.equal(goc.mat_khau, 'a');
  let sau = {}; const dau = sau;
  for (let i = 0; i < 20; i += 1) { sau.x = {}; sau = sau.x; }
  assert.doesNotThrow(() => che(dau));
});

test('tao_log ghi mỗi dòng một JSON hợp lệ và đã che', () => {
  const dong = [];
  const log = tao_log({ ghi: (d) => dong.push(d), dong_ho: () => Date.UTC(2026, 9, 18) });
  log.loi(`thất bại ${JWT_MAU}`, { mat_khau: 'BiMat123456', ma_yeu_cau: 'r1' });
  const ban_ghi = JSON.parse(dong[0]);
  assert.equal(ban_ghi.muc, 'loi');
  assert.equal(ban_ghi.thoi_diem, '2026-10-18T00:00:00.000Z');
  assert.equal(ban_ghi.mat_khau, MAT_NA);
  assert.equal(ban_ghi.ma_yeu_cau, 'r1');
  assert.equal(dong[0].includes('BiMat123456'), false);
  assert.equal(dong[0].includes('eyJ'), false);
});
