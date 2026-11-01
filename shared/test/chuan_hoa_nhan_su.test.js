"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../src/index.js");

const goc = () => ({
  ma_nhan_vien: " mau0001 ",
  ho_ten_khai_sinh: "  Nguyễn   Văn   Đức ",
  ten_goi_khac: "Không",
  so_hieu: "20.364.26",
  ngay_sinh: { nam: 1990, thang: 5, ngay: 6 },
  ngay_bo_nhiem: { nam: 2024, thang: 11 },
  nam_tot_nghiep_pho_thong: { nam: 2008 },
  gioi_tinh: "nam",
  chuc_vu: "   ",
  que_quan: {
    xa_phuong: " Xã Quảng Điền ",
    tinh_tp: "Thành phố Huế",
    van_ban_goc: "",
  },
  noi_o_hien_nay: {
    so_nha_duong: null,
    xa_phuong: null,
    tinh_tp: null,
    van_ban_goc: "   ",
  },
  than_nhan: [
    {
      nhom: "cua_ban_than",
      quan_he: "con",
      ho_ten: " Nguyễn Thị  Mai ",
      ngay_sinh: { nam: 2025, thang: 4, ngay: 2 },
    },
    {
      id: "co_san",
      nhom: "cua_vo_chong",
      quan_he: "me",
      ho_ten: "Trần Thị Đào",
    },
  ],
  luong: [
    {
      tu: { nam: 2020, thang: 7 },
      den: null,
      dang_dien_ra: true,
      he_so_luong: 4,
    },
  ],
});

test("chuan_hoa_nhan_su: gọn chuỗi, mã viết hoa, chuỗi rỗng → null, ngày không đủ có ngày chuẩn hóa", () => {
  const kq = S.chuan_hoa_nhan_su(goc());
  assert.equal(kq.ma_nhan_vien, "MAU0001");
  assert.equal(kq.ho_ten_khai_sinh, "Nguyễn Văn Đức");
  assert.equal(kq.chuc_vu, null);
  assert.equal(
    kq.ten_goi_khac,
    "Không",
    "'Không' là giá trị đã khai, được giữ nguyên",
  );
  assert.equal(kq.ngay_sinh.do_chinh_xac, "ngay");
  assert.equal(
    kq.ngay_sinh.ngay_chuan_hoa.toISOString(),
    "1990-05-06T00:00:00.000Z",
  );
  assert.equal(kq.ngay_bo_nhiem.do_chinh_xac, "thang");
  assert.equal(kq.nam_tot_nghiep_pho_thong.do_chinh_xac, "nam");
  assert.equal(
    kq.luong[0].tu.ngay_chuan_hoa.toISOString(),
    "2020-07-01T00:00:00.000Z",
  );
  assert.equal(kq.luong[0].den, null);
});

test('chuan_hoa_nhan_su: tim_kiem của hồ sơ và của từng thân nhân; "Không" không vào tim_kiem', () => {
  const kq = S.chuan_hoa_nhan_su(goc());
  assert.equal(kq.tim_kiem, "nguyen van duc mau0001 20.364.26");
  assert.equal(kq.than_nhan[0].tim_kiem, "nguyen thi mai");
  assert.equal(kq.than_nhan[1].tim_kiem, "tran thi dao");
  assert.equal(kq.than_nhan[0].ho_ten, "Nguyễn Thị Mai");
  const co_ten_khac = S.chuan_hoa_nhan_su({
    ...goc(),
    ten_goi_khac: "Đức Béo",
  });
  assert.match(co_ten_khac.tim_kiem, /duc beo/);
});

test("chuan_hoa_nhan_su: địa chỉ — ghép van_ban_goc từ các phần; địa chỉ rỗng → null", () => {
  const kq = S.chuan_hoa_nhan_su(goc());
  assert.deepEqual(kq.que_quan, {
    so_nha_duong: null,
    xa_phuong: "Xã Quảng Điền",
    tinh_tp: "Thành phố Huế",
    van_ban_goc: "Xã Quảng Điền, Thành phố Huế",
  });
  assert.equal(kq.noi_o_hien_nay, null);
});

test("chuan_hoa_nhan_su: gán id cho phần tử mảng chưa có id nếu có tao_id; giữ id sẵn có", () => {
  let n = 0;
  const kq = S.chuan_hoa_nhan_su(goc(), { tao_id: () => `id${++n}` });
  assert.equal(kq.than_nhan[0].id, "id1");
  assert.equal(kq.than_nhan[1].id, "co_san");
  assert.equal(kq.luong[0].id, "id2");
  const khong = S.chuan_hoa_nhan_su(goc());
  assert.equal("id" in khong.than_nhan[0], false);
});

test("chuan_hoa_nhan_su: không sửa đối tượng đầu vào, chạy lại cho cùng kết quả (idempotent)", () => {
  const dau_vao = goc();
  const ban_sao = JSON.stringify(dau_vao);
  const lan1 = S.chuan_hoa_nhan_su(dau_vao);
  assert.equal(JSON.stringify(dau_vao), ban_sao);
  const lan2 = S.chuan_hoa_nhan_su(lan1);
  assert.deepEqual(lan2, lan1);
});

test("chuan_hoa_nhan_su: ném lỗi có chỉ rõ đường dẫn khi ngày hoặc kiểu sai", () => {
  assert.throws(
    () =>
      S.chuan_hoa_nhan_su({
        ...goc(),
        ngay_sinh: { nam: 1990, thang: 2, ngay: 30 },
      }),
    /ngay_sinh: Ngày không hợp lệ/,
  );
  assert.throws(
    () =>
      S.chuan_hoa_nhan_su({
        ...goc(),
        than_nhan: [{ ho_ten: "A", ngay_sinh: { nam: 3000 } }],
      }),
    /than_nhan\[0\]\.ngay_sinh/,
  );
  assert.throws(
    () => S.chuan_hoa_nhan_su({ ...goc(), ho_ten_khai_sinh: 5 }),
    /ho_ten_khai_sinh: phải là chuỗi/,
  );
  assert.throws(
    () => S.chuan_hoa_nhan_su({ ...goc(), luong: "x" }),
    /luong: phải là mảng/,
  );
});

test("chuan_hoa_nhan_su: trường chưa khai báo được giữ nguyên để validator của CSDL từ chối", () => {
  assert.equal(S.chuan_hoa_nhan_su({ ...goc(), truong_la: 1 }).truong_la, 1);
});

test("chuan_hoa_nghi_phep: ngày về 00:00 UTC", () => {
  const kq = S.chuan_hoa_nghi_phep({
    tu_ngay: "2026-10-05",
    den_ngay: new Date("2026-10-07T01:00:00Z"),
    loai_phep: "phep_nam",
    ghi_chu: "  nghỉ  ",
  });
  assert.equal(kq.tu_ngay.toISOString(), "2026-10-05T00:00:00.000Z");
  assert.equal(kq.den_ngay.toISOString(), "2026-10-07T00:00:00.000Z");
  assert.equal(kq.ghi_chu, "nghỉ");
});
test("ngày thuần chỉ nhận yyyy-mm-dd: từ chối chuỗi có giờ/múi giờ và ngày không tồn tại (31/02)", () => {
  const co = (v) => () =>
    S.chuan_hoa_nghi_phep({
      tu_ngay: v,
      den_ngay: "2026-10-07",
      loai_phep: "phep_nam",
    });
  assert.throws(co("2026-10-05T00:00:00+07:00"), RangeError);
  assert.throws(co("05/10/2026"), RangeError);
  assert.throws(co("2026-02-31"), RangeError);
  assert.doesNotThrow(co("2026-10-05"));
});
