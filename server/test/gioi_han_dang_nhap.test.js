"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { tao_kho_bo_nho } = require("./ho_tro/kho_bo_nho");
const { tao_dong_ho_gia } = require("./ho_tro/gia");
const { tao_gioi_han } = require("../src/dich_vu/gioi_han_dang_nhap");

const CUA_SO = 15 * 60 * 1000;
function tao(tuy = {}) {
  const kho = tao_kho_bo_nho();
  const dong_ho = tao_dong_ho_gia();
  const gh = tao_gioi_han({
    kho: kho.luot_dang_nhap,
    dong_ho: dong_ho.now,
    sai_toi_da_tai_khoan: 3,
    sai_toi_da_ip: 6,
    cua_so_ms: CUA_SO,
    ...tuy,
  });
  return { kho, dong_ho, gh };
}
const thu = (gh, ten, ip = "10.0.0.1") => gh.giu_cho_dang_nhap({ ten, ip });

test("cho phép đúng ngưỡng lượt thử, lượt tiếp theo bị khóa", async () => {
  const { gh } = tao();
  for (let i = 0; i < 3; i += 1)
    assert.equal((await thu(gh, "a")).bi_khoa, false, `lượt ${i + 1}`);
  const bi_chan = await thu(gh, "a");
  assert.equal(bi_chan.bi_khoa, true);
  assert.equal(bi_chan.thu_lai_sau_giay, 900);
});

test("khóa theo tài khoản không ảnh hưởng tài khoản khác cùng IP", async () => {
  const { gh } = tao();
  for (let i = 0; i < 4; i += 1) await thu(gh, "a");
  assert.equal((await thu(gh, "b")).bi_khoa, false);
});

// test('khóa theo tài khoản có hiệu lực ở mọi IP', async () => {
//   const { gh } = tao();
//   for (let i = 0; i < 3; i += 1) await thu(gh, 'a', '10.0.0.1');
//   assert.equal((await thu(gh, 'a', '10.0.0.2')).bi_khoa, true);
// });
test("khóa theo (tên + IP): IP khác vẫn đăng nhập được, không bị người lạ khóa hộ", async () => {
  const { gh } = tao();
  for (let i = 0; i < 3; i += 1) await thu(gh, "a", "10.0.0.1");
  assert.equal(
    (await thu(gh, "a", "10.0.0.1")).bi_khoa,
    true,
    "IP đang tấn công bị khóa",
  );
  assert.equal(
    (await thu(gh, "a", "10.0.0.2")).bi_khoa,
    false,
    "người dùng thật ở IP khác vẫn thử được",
  );
});

test("ngưỡng rộng theo tên: tấn công phân tán từ nhiều IP vẫn bị chặn (gấp 6 lần ngưỡng thường)", async () => {
  const { gh } = tao();
  for (let i = 0; i < 18; i += 1)
    assert.equal(
      (await thu(gh, "a", `10.0.1.${i}`)).bi_khoa,
      false,
      `lượt ${i + 1}`,
    );
  assert.equal((await thu(gh, "a", "10.0.1.99")).bi_khoa, true);
});

test("đăng nhập thành công xóa lượt của đúng (tên + IP)", async () => {
  const { gh } = tao();
  for (let i = 0; i < 2; i += 1) await thu(gh, "a", "10.0.0.1");
  const lan_3 = await thu(gh, "a", "10.0.0.1");
  await gh.ghi_nhan_thanh_cong(lan_3.luot);
  for (let i = 0; i < 3; i += 1)
    assert.equal((await thu(gh, "a", "10.0.0.1")).bi_khoa, false);
});

test("khóa theo IP: nhiều tên khác nhau từ một IP cũng bị chặn", async () => {
  const { gh } = tao();
  for (let i = 0; i < 6; i += 1)
    assert.equal((await thu(gh, `u${i}`)).bi_khoa, false);
  assert.equal((await thu(gh, "u_moi")).bi_khoa, true);
  assert.equal(
    (await thu(gh, "u_moi", "10.0.0.2")).bi_khoa,
    false,
    "IP khác vẫn thử được",
  );
});

test("lượt bị chặn không kéo dài thời gian khóa", async () => {
  const { gh } = tao();
  for (let i = 0; i < 3; i += 1) await thu(gh, "a");
  const dau = await thu(gh, "a");
  for (let i = 0; i < 30; i += 1) await thu(gh, "a");
  const sau = await thu(gh, "a");
  assert.equal(sau.thu_lai_sau_giay, dau.thu_lai_sau_giay);
});

test("hết khóa khi lượt cũ hết hạn; thời gian còn lại giảm dần", async () => {
  const { gh, dong_ho } = tao();
  for (let i = 0; i < 3; i += 1) await thu(gh, "a");
  dong_ho.tien(5 * 60 * 1000);
  const con_lai = await thu(gh, "a");
  assert.equal(con_lai.bi_khoa, true);
  assert.equal(con_lai.thu_lai_sau_giay, 600);
  dong_ho.tien(10 * 60 * 1000); // đủ 15 phút kể từ lượt đầu
  assert.equal((await thu(gh, "a")).bi_khoa, false);
});

test("đăng nhập thành công xóa lượt của tài khoản và lượt IP của chính lần đó", async () => {
  const { gh, kho } = tao();
  await thu(gh, "a");
  await thu(gh, "a");
  const giu = await thu(gh, "a");
  await gh.ghi_nhan_thanh_cong(giu.luot);
  assert.equal(kho._du_lieu.luot.filter((x) => x.khoa === "tk:a").length, 0);
  // 2 lượt sai trước đó vẫn tính vào IP, lượt thành công thì không
  assert.equal(
    kho._du_lieu.luot.filter((x) => x.khoa === "ip:10.0.0.1").length,
    2,
  );
});

test("các lượt gửi song song không vượt được ngưỡng", async () => {
  const { gh } = tao({ sai_toi_da_tai_khoan: 3 });
  const ket_qua = await Promise.all(
    Array.from({ length: 12 }, () => thu(gh, "a")),
  );
  assert.ok(ket_qua.filter((k) => !k.bi_khoa).length <= 3);
});

test("thử dồn dập khi đang bị khóa không làm khóa kéo dài quá 15 phút kể từ các lượt sai ban đầu", async () => {
  const { gh, dong_ho } = tao();
  for (let i = 0; i < 3; i += 1) await thu(gh, "a"); // 3 lượt sai lúc t0
  for (let phut = 1; phut <= 10; phut += 1) {
    dong_ho.tien(60 * 1000);
    assert.equal((await thu(gh, "a")).bi_khoa, true, `phút ${phut}`);
  }
  dong_ho.tien(5 * 60 * 1000 + 1000); // t0 + 15 phút + 1 giây
  assert.equal((await thu(gh, "a")).bi_khoa, false);
});
