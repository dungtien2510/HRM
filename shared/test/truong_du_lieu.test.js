"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../src/index.js");

const la = S.liet_ke_truong("nhan_su");
const nhay_cam = new Set(S.MA_MUC_NHAY_CAM);

test("mọi trường thuộc đúng một mục hợp lệ (11 mục quyền hoặc ky_thuat), không trùng đường dẫn", () => {
  const hop_le = new Set([...S.MA_MUC_QUYEN, "ky_thuat"]);
  const da_thay = new Set();
  for (const l of la) {
    assert.ok(hop_le.has(l.muc), `${l.duong_dan}: mục ${l.muc}`);
    assert.equal(da_thay.has(l.duong_dan), false, `trùng ${l.duong_dan}`);
    da_thay.add(l.duong_dan);
  }
});

test("cả 11 mục quyền đều có ít nhất một trường trong nhan_su", () => {
  for (const muc of S.MA_MUC_QUYEN) {
    if (muc === "nghi_phep") continue; // mục nghỉ phép nằm ở collection nghi_phep
    assert.ok(
      la.some((l) => l.muc === muc),
      `mục ${muc} không có trường nào`,
    );
  }
  assert.ok(S.liet_ke_truong("nghi_phep").some((l) => l.muc === "nghi_phep"));
});

test("trường căn cước và tiền án của thân nhân thuộc mục riêng, không thuộc than_nhan", () => {
  assert.equal(
    S.muc_cua_duong_dan("nhan_su", "than_nhan.so_can_cuoc"),
    "so_can_cuoc",
  );
  assert.equal(
    S.muc_cua_duong_dan("nhan_su", "than_nhan.tien_an"),
    "tien_an_tien_su",
  );
  assert.equal(S.muc_cua_duong_dan("nhan_su", "than_nhan.ho_ten"), "than_nhan");
  assert.equal(S.muc_cua_duong_dan("nhan_su", "so_can_cuoc"), "so_can_cuoc");
});

test("trường theo yêu cầu có đúng mục (thuật ngữ đã chốt ở Q12)", () => {
  const muc = (p) => S.muc_cua_duong_dan("nhan_su", p);
  assert.equal(muc("ma_nhan_vien"), "thong_tin_co_ban");
  assert.equal(muc("bo_phan"), "thong_tin_co_ban");
  assert.equal(muc("chuc_vu"), "thong_tin_co_ban");
  assert.equal(muc("ngay_nhap_ngu"), "qua_trinh_cong_tac");
  assert.equal(muc("quan_ham_chuc_vu_cao_nhat"), "qua_trinh_cong_tac");
  assert.equal(muc("luong.he_so_luong"), "luong");
  assert.equal(muc("ky_luat.het_hieu_luc"), "ky_luat");
  assert.equal(muc("tien_an_tien_su.loai"), "tien_an_tien_su");
  assert.equal(muc("khen_thuong.thoi_diem"), "khen_thuong");
  assert.equal(muc("so_dien_thoai"), "lien_he");
  assert.equal(muc("dao_tao.tu"), "dao_tao");
  assert.equal(muc("version"), "ky_thuat");
});

test("muc_cua_duong_dan: đi sâu vào ngày, bỏ chỉ số mảng, từ chối đường dẫn lạ hoặc là mảng", () => {
  const muc = (p) => S.muc_cua_duong_dan("nhan_su", p);
  assert.equal(muc("than_nhan.ngay_sinh.ngay_chuan_hoa"), "than_nhan");
  assert.equal(muc("ngay_sinh.nam"), "thong_tin_co_ban");
  assert.equal(muc("than_nhan.0.so_can_cuoc"), "so_can_cuoc");
  assert.equal(muc("than_nhan.$.ho_ten"), "than_nhan");
  assert.equal(muc("khong_co_truong_nay"), null);
  assert.equal(
    muc("than_nhan"),
    null,
    "đường dẫn là mảng nhiều mục → phải dùng đường dẫn lá",
  );
  assert.equal(muc(""), null);
  assert.equal(muc(null), null);
  assert.equal(muc("$where"), null);
});

test("tao_projection chỉ gồm trường thuộc mục được xem; không bao giờ có tim_kiem", () => {
  const p = S.tao_projection(["thong_tin_co_ban"]);
  for (const khoa of Object.keys(p)) {
    const l = la.find((x) => x.duong_dan === khoa);
    assert.ok(
      l && (l.muc === "thong_tin_co_ban" || l.muc === "ky_thuat"),
      khoa,
    );
  }
  assert.equal(p.ma_nhan_vien, 1);
  assert.equal(p._id, 1);
  assert.equal(p.version, 1);
  assert.equal("tim_kiem" in p, false);
  assert.equal("so_can_cuoc" in p, false);
  assert.equal("luong.he_so_luong" in p, false);
  assert.equal("than_nhan.ho_ten" in p, false);
  assert.ok(Object.values(p).every((v) => v === 1));
});

test("tao_projection: có than_nhan nhưng không có so_can_cuoc thì từng thân nhân không có căn cước và tiền án", () => {
  const p = S.tao_projection(["thong_tin_co_ban", "than_nhan"]);
  assert.equal(p["than_nhan.ho_ten"], 1);
  assert.equal(p["than_nhan.ngay_sinh"], 1);
  assert.equal("than_nhan.so_can_cuoc" in p, false);
  assert.equal("than_nhan.tien_an" in p, false);
  assert.equal("than_nhan.tim_kiem" in p, false);
  const day_du = S.tao_projection([
    "thong_tin_co_ban",
    "than_nhan",
    "so_can_cuoc",
    "tien_an_tien_su",
  ]);
  assert.equal(day_du["than_nhan.so_can_cuoc"], 1);
  assert.equal(day_du["than_nhan.tien_an"], 1);
});

test("tao_projection: mục lạ, danh sách rỗng hoặc không phải mảng → chỉ có trường kỹ thuật", () => {
  for (const x of [[], ["khong_co"], null, undefined, "luong", ["ky_thuat"]]) {
    const p = S.tao_projection(x);
    //assert.deepEqual(Object.keys(p).sort(), ['_id', 'created_at', 'la_mau', 'updated_at', 'version']);
    assert.deepEqual(Object.keys(p).sort(), [
      "_id",
      "created_at",
      "da_xoa",
      "la_mau",
      "updated_at",
      "version",
      "xoa_luc",
    ]);
  }
});

test("tao_projection cho cả 11 mục = mọi trường trừ trường nội bộ", () => {
  const p = S.tao_projection(S.MA_MUC_QUYEN);
  const mong_doi = la
    .filter((l) => !l.noi_bo)
    .map((l) => l.duong_dan)
    .sort();
  assert.deepEqual(Object.keys(p).sort(), mong_doi);
  const gom_noi_bo = S.tao_projection(S.MA_MUC_QUYEN, { gom_noi_bo: true });
  assert.ok("tim_kiem" in gom_noi_bo && "than_nhan.tim_kiem" in gom_noi_bo);
});

test("mỗi mục nhạy cảm chỉ xuất hiện khi được cấp (kiểm từng mục)", () => {
  for (const muc of S.MA_MUC_NHAY_CAM) {
    const co = S.tao_projection([muc]);
    const khong = S.tao_projection(S.MA_MUC_QUYEN.filter((m) => m !== muc));
    const cua_muc = la
      .filter((l) => l.muc === muc && !l.noi_bo)
      .map((l) => l.duong_dan);
    if (muc === "nghi_phep") continue;
    assert.ok(cua_muc.length > 0, muc);
    for (const d of cua_muc) {
      assert.equal(d in co, true, `${muc}:${d} phải có khi được cấp`);
      assert.equal(
        d in khong,
        false,
        `${muc}:${d} không được lộ khi không được cấp`,
      );
    }
  }
});

test("collection nghi_phep: toàn bộ trường nghiệp vụ thuộc mục nghi_phep", () => {
  const p = S.tao_projection(["thong_tin_co_ban"], { collection: "nghi_phep" });
  assert.equal("tu_ngay" in p, false);
  assert.equal("nhan_su_id" in p, false);
  const co = S.tao_projection(["nghi_phep"], { collection: "nghi_phep" });
  for (const k of [
    "nhan_su_id",
    "tu_ngay",
    "den_ngay",
    "loai_phep",
    "so_ngay",
    "ghi_chu",
  ])
    assert.equal(co[k], 1, k);
});

test("kiem_tra_truong_truy_van: lọc/sắp xếp/tìm kiếm cũng bị giới hạn theo mục", () => {
  const kt = S.kiem_tra_truong_truy_van;
  assert.deepEqual(kt("nhan_su", ["thong_tin_co_ban"], "bo_phan"), {
    ok: true,
    muc: "thong_tin_co_ban",
  });
  assert.deepEqual(kt("nhan_su", ["thong_tin_co_ban"], "version"), {
    ok: true,
    muc: "ky_thuat",
  });
  assert.equal(
    kt("nhan_su", ["thong_tin_co_ban"], "luong.he_so_luong").ok,
    false,
  );
  assert.equal(
    kt("nhan_su", ["thong_tin_co_ban"], "luong.he_so_luong").ly_do,
    "khong_co_quyen_muc",
  );
  assert.equal(
    kt("nhan_su", ["thong_tin_co_ban", "luong"], "luong.he_so_luong").ok,
    true,
  );
  assert.equal(
    kt("nhan_su", ["thong_tin_co_ban"], "than_nhan.ngay_sinh.ngay_chuan_hoa")
      .ok,
    false,
  );
  assert.equal(
    kt("nhan_su", S.MA_MUC_QUYEN, "mat_khau_bam").ly_do,
    "truong_chua_khai_bao",
  );
  assert.equal(kt("nhan_su", null, "bo_phan").ok, false);
});

test("tim_kiem: dùng để tìm được nhưng là trường nội bộ thuộc thong_tin_co_ban", () => {
  const l = S.tim_truong("nhan_su", "tim_kiem");
  assert.equal(l.muc, "thong_tin_co_ban");
  assert.equal(l.noi_bo, true);
  const tn = S.tim_truong("nhan_su", "than_nhan.tim_kiem");
  assert.equal(tn.muc, "than_nhan");
  assert.equal(tn.noi_bo, true);
});

test("loc_tai_lieu_theo_muc khớp với projection: không lộ trường ngoài quyền, mảng rỗng bị bỏ", () => {
  const ho_so = {
    _id: "x",
    version: 3,
    ma_nhan_vien: "MAU0001",
    ho_ten_khai_sinh: "A",
    tim_kiem: "a mau0001",
    so_can_cuoc: "000123456789",
    so_dien_thoai: "0000000001",
    luong: [{ id: 1, he_so_luong: 3.2 }],
    ky_luat: [{ id: 2, hinh_thuc: "Khiển trách" }],
    than_nhan: [
      {
        id: 3,
        ho_ten: "B",
        so_can_cuoc: "000987654321",
        tien_an: "Không",
        tim_kiem: "b",
      },
    ],
    truong_la: "bi_mat",
  };
  const co_ban = S.loc_tai_lieu_theo_muc("nhan_su", ho_so, [
    "thong_tin_co_ban",
  ]);
  assert.deepEqual(co_ban, {
    _id: "x",
    version: 3,
    ma_nhan_vien: "MAU0001",
    ho_ten_khai_sinh: "A",
  });
  const tn = S.loc_tai_lieu_theo_muc("nhan_su", ho_so, [
    "thong_tin_co_ban",
    "than_nhan",
  ]);
  assert.deepEqual(tn.than_nhan, [{ id: 3, ho_ten: "B" }]);
  const tn_scc = S.loc_tai_lieu_theo_muc("nhan_su", ho_so, [
    "than_nhan",
    "so_can_cuoc",
  ]);
  assert.deepEqual(tn_scc.than_nhan, [
    { id: 3, ho_ten: "B", so_can_cuoc: "000987654321" },
  ]);
  assert.equal(tn_scc.so_can_cuoc, "000123456789");
  assert.equal(
    "truong_la" in S.loc_tai_lieu_theo_muc("nhan_su", ho_so, S.MA_MUC_QUYEN),
    false,
    "trường chưa khai báo không bao giờ được trả ra",
  );
  assert.equal(
    "tim_kiem" in S.loc_tai_lieu_theo_muc("nhan_su", ho_so, S.MA_MUC_QUYEN),
    false,
  );
});

test("bảng khai báo bị đóng băng", () => {
  assert.throws(() => {
    S.BANG_TRUONG.nhan_su.truong.ma_nhan_vien.muc = "luong";
  }, TypeError);
  assert.throws(() => {
    S.BANG_TRUONG.nhan_su.truong.moi = {};
  }, TypeError);
});

test("trường bắt buộc ở mức CSDL và theo biểu mẫu", () => {
  const csdl = S.liet_ke_bat_buoc("nhan_su", "csdl");
  for (const t of [
    "_id",
    "version",
    "created_at",
    "updated_at",
    "ma_nhan_vien",
    "ho_ten_khai_sinh",
    "bo_phan",
    "tim_kiem",
    "than_nhan.nhom",
    "than_nhan.quan_he",
    "than_nhan.ho_ten",
  ]) {
    assert.ok(csdl.includes(t), t);
  }
  assert.ok(S.liet_ke_bat_buoc("nhan_su", "nghiep_vu").includes("so_can_cuoc"));
  assert.ok(nhay_cam.has("so_can_cuoc"));
});
