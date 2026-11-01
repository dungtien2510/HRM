'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { tao_api_khach } = require('../src/main/api_khach');

const GOC = 'https://hrm.tieudoantt.local:8443';

function phan_hoi(trang_thai, noi_dung, la_json = true) {
  return { ok: trang_thai >= 200 && trang_thai < 300, status: trang_thai, json: async () => { if (!la_json) throw new SyntaxError('không phải JSON'); return noi_dung; } };
}

function tao({ tra_ve, dia_chi = GOC } = {}) {
  const cuoc_goi = [];
  const su_kien = [];
  const hang_doi = [...(tra_ve || [])];
  const fetch_ham = async (url, tuy_chon) => {
    cuoc_goi.push({ url, tuy_chon });
    const x = hang_doi.shift();
    if (x instanceof Error) throw x;
    return x;
  };
  const api = tao_api_khach({
    lay_dia_chi: () => dia_chi, phien_ban: '0.1.0', ten_may: 'MAY-01', fetch_ham,
    tren_su_kien: (ten, du_lieu) => su_kien.push({ ten, du_lieu }),
  });
  return { api, cuoc_goi, su_kien };
}

const DANG_NHAP_OK = phan_hoi(200, { token: 'JWT-BI-MAT-xyz', het_han_luc: '2026-10-18T09:00:00.000Z', tai_khoan: { id: '1', ten_dang_nhap: 'admin', loai: 'admin', muc_duoc_xem: [], quyen_ghi: true } });

test('đăng nhập: gửi header phiên bản + tên máy, không trả token cho renderer, các lần gọi sau mang Bearer', async () => {
  const { api, cuoc_goi } = tao({ tra_ve: [DANG_NHAP_OK, phan_hoi(200, { tai_khoan: { id: '1' } })] });
  const kq = await api.dang_nhap('admin', 'mk');
  assert.equal(kq.ok, true);
  assert.equal(JSON.stringify(kq).includes('JWT-BI-MAT-xyz'), false, 'token không được lộ ra ngoài');
  assert.equal(api.da_dang_nhap(), true);
  const lan1 = cuoc_goi[0];
  assert.equal(lan1.url, `${GOC}/auth/login`);
  assert.equal(lan1.tuy_chon.method, 'POST');
  assert.equal(lan1.tuy_chon.headers['x-hrm-app-version'], '0.1.0');
  assert.equal(lan1.tuy_chon.headers['x-hrm-may'], 'MAY-01');
  assert.equal(lan1.tuy_chon.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(lan1.tuy_chon.body), { ten_dang_nhap: 'admin', mat_khau: 'mk' });
  assert.equal(lan1.tuy_chon.redirect, 'error');
  await api.toi_la_ai();
  assert.equal(cuoc_goi[1].tuy_chon.headers.Authorization, 'Bearer JWT-BI-MAT-xyz');
  assert.equal(cuoc_goi[1].url, `${GOC}/auth/me`);
});

test('sai mật khẩu (401 khi đăng nhập) không bị coi là hết phiên', async () => {
  const { api, su_kien } = tao({ tra_ve: [phan_hoi(401, { loi: { ma: 'SAI_THONG_TIN_DANG_NHAP', thong_diep: 'Tên đăng nhập hoặc mật khẩu không đúng.' } })] });
  const kq = await api.dang_nhap('a', 'b');
  assert.equal(kq.ok, false);
  assert.equal(kq.ma, 'SAI_THONG_TIN_DANG_NHAP');
  assert.equal(su_kien.some((s) => s.ten === 'phien_het_han'), false);
});

test('401 khi đã đăng nhập: xóa token và báo phiên hết hạn', async () => {
  const { api, su_kien } = tao({ tra_ve: [DANG_NHAP_OK, phan_hoi(401, { loi: { ma: 'CHUA_DANG_NHAP', thong_diep: 'hết hạn' } })] });
  await api.dang_nhap('admin', 'mk');
  const kq = await api.toi_la_ai();
  assert.equal(kq.ok, false);
  assert.equal(api.da_dang_nhap(), false);
  assert.equal(su_kien.filter((s) => s.ten === 'phien_het_han').length, 1);
});

test('426: báo cần cập nhật kèm phiên bản tối thiểu', async () => {
  const { api, su_kien } = tao({ tra_ve: [phan_hoi(426, { loi: { ma: 'CAN_CAP_NHAT', thong_diep: 'Cũ', phien_ban_toi_thieu: '0.5.0' } })] });
  const kq = await api.dang_nhap('a', 'b');
  assert.equal(kq.ma, 'CAN_CAP_NHAT');
  assert.equal(kq.phien_ban_toi_thieu, '0.5.0');
  const s = su_kien.find((x) => x.ten === 'can_cap_nhat');
  assert.equal(s.du_lieu.phien_ban_toi_thieu, '0.5.0');
});

test('429: chuyển thu_lai_sau_giay cho giao diện', async () => {
  const { api } = tao({ tra_ve: [phan_hoi(429, { loi: { ma: 'TAM_KHOA', thong_diep: 'Khóa', thu_lai_sau_giay: 840 } })] });
  const kq = await api.dang_nhap('a', 'b');
  assert.equal(kq.ma, 'TAM_KHOA');
  assert.equal(kq.thu_lai_sau_giay, 840);
});

test('422/400: chuyển chi tiết lỗi từng trường', async () => {
  const chi_tiet = [{ truong: 'mat_khau', thong_diep: 'Chưa nhập mật khẩu' }];
  const { api } = tao({ tra_ve: [phan_hoi(400, { loi: { ma: 'DU_LIEU_KHONG_HOP_LE', thong_diep: 'Sai', chi_tiet } })] });
  const kq = await api.dang_nhap('a', '');
  assert.deepEqual(kq.chi_tiet, chi_tiet);
});

test('mất kết nối: phân loại lỗi, báo sự kiện một lần, rồi báo hồi phục khi gọi được lại', async () => {
  const loi_chung_chi = new TypeError('net::ERR_CERT_AUTHORITY_INVALID');
  const { api, su_kien } = tao({ tra_ve: [loi_chung_chi, loi_chung_chi, phan_hoi(200, { trang_thai: 'ok' })] });
  const a = await api.kiem_tra_dinh_ky();
  assert.equal(a.trang_thai, 'mat_ket_noi');
  assert.equal(a.ma, 'CHUNG_CHI_KHONG_TIN_CAY');
  await api.kiem_tra_dinh_ky();
  const b = await api.kiem_tra_dinh_ky();
  assert.equal(b.trang_thai, 'ket_noi_tot');
  const ket_noi = su_kien.filter((s) => s.ten === 'ket_noi').map((s) => s.du_lieu.trang_thai);
  assert.deepEqual(ket_noi, ['mat_ket_noi', 'ket_noi_tot'], 'chỉ báo khi trạng thái đổi');
});

test('lỗi mạng khi gọi API trả ok:false kèm loi_mang, không ném lỗi', async () => {
  const { api } = tao({ tra_ve: [new TypeError('net::ERR_CONNECTION_REFUSED')] });
  const kq = await api.dang_nhap('a', 'b');
  assert.equal(kq.ok, false);
  assert.equal(kq.loi_mang, true);
  assert.equal(kq.ma, 'MAY_CHU_TU_CHOI');
});

test('503 từ máy chủ: trạng thái "máy chủ gặp sự cố", không phải mất kết nối', async () => {
  const { api } = tao({ tra_ve: [phan_hoi(503, { trang_thai: 'loi' })] });
  const t = await api.kiem_tra_dinh_ky();
  assert.equal(t.trang_thai, 'may_chu_gap_su_co');
});

test('phản hồi không phải JSON: không vỡ ứng dụng', async () => {
  const a = tao({ tra_ve: [phan_hoi(200, null, false)] });
  assert.equal((await a.api.dang_nhap('a', 'b')).ma, 'PHAN_HOI_KHONG_HOP_LE');
  const b = tao({ tra_ve: [phan_hoi(502, null, false)] });
  const kq = await b.api.dang_nhap('a', 'b');
  assert.equal(kq.ok, false);
  assert.equal(kq.ma, 'LOI_KHONG_RO');
});

test('chưa cấu hình máy chủ: không gọi mạng', async () => {
  const { api, cuoc_goi } = tao({ dia_chi: null });
  assert.equal((await api.dang_nhap('a', 'b')).ma, 'CHUA_CAU_HINH_MAY_CHU');
  assert.equal(cuoc_goi.length, 0);
});

test('toi_la_ai khi chưa đăng nhập: không gọi mạng', async () => {
  const { api, cuoc_goi } = tao({ tra_ve: [] });
  assert.equal((await api.toi_la_ai()).ma, 'CHUA_DANG_NHAP');
  assert.equal(cuoc_goi.length, 0);
});

test('kiem_tra_may_chu dùng địa chỉ truyền vào (chưa lưu), không gửi token', async () => {
  const { api, cuoc_goi } = tao({ dia_chi: null, tra_ve: [phan_hoi(200, { trang_thai: 'ok' })] });
  const kq = await api.kiem_tra_may_chu('https://may.moi.local:9443');
  assert.equal(kq.ok, true);
  assert.equal(cuoc_goi[0].url, 'https://may.moi.local:9443/health');
  assert.equal(cuoc_goi[0].tuy_chon.headers.Authorization, undefined);
});

test('kiem_tra_may_chu: lỗi chứng chỉ → thông điệp và gợi ý tiếng Việt', async () => {
  const { api } = tao({ dia_chi: null, tra_ve: [new TypeError('net::ERR_CERT_COMMON_NAME_INVALID')] });
  const kq = await api.kiem_tra_may_chu('https://192.168.1.20:8443');
  assert.equal(kq.ok, false);
  assert.equal(kq.ma, 'CHUNG_CHI_SAI_TEN');
  assert.ok(kq.goi_y);
});

test('đăng xuất xóa token', async () => {
  const { api } = tao({ tra_ve: [DANG_NHAP_OK] });
  await api.dang_nhap('admin', 'mk');
  api.dang_xuat();
  assert.equal(api.da_dang_nhap(), false);
  assert.equal((await api.toi_la_ai()).ma, 'CHUA_DANG_NHAP');
});
