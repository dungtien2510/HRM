"use strict";
/**
 * Nạp ~200 hồ sơ nhân sự MẪU (giả) và nghỉ phép mẫu để thử các bước sau. Không dùng dữ liệu thật.
 *   npm run nap_du_lieu_mau --workspace server [-- tùy chọn]
 *   --so-luong=200   --hat-giong=20261024   --ngay-tham-chieu=2026-10-24   (mặc định: hôm nay, UTC)
 *   --kem-tai-khoan-mau   tạo thêm 2 tài khoản thử (xem_day_du, xem_mot_so_muc) với mật khẩu ngẫu nhiên in ra một lần
 *   --xoa                 chỉ xóa dữ liệu mẫu (mọi tài liệu có la_mau: true), không nạp
 *   --yes                 không hỏi xác nhận
 * Chạy lại được: luôn xóa dữ liệu mẫu cũ (la_mau: true) rồi nạp lại; KHÔNG đụng vào hồ sơ thật.
 * Dùng user ứng dụng trong .env (không cần user quản trị). CHỈ dùng trên máy thử.
 */
const os = require("node:os");
const crypto = require("node:crypto");
const { ObjectId } = require("mongodb");
const {
  LOAI_TAI_KHOAN,
  HANH_DONG_NHAT_KY,
  KET_QUA_NHAT_KY,
  ngay_vn,
} = require("@hrm/shared");
const { nap_tep_env, hoi } = require("./nhap_lieu");
const { doc_cau_hinh } = require("../src/cau_hinh");
const { ket_noi_mongo } = require("../src/csdl");
const { kiem_tra_phien_ban_schema } = require("../src/csdl/cau_truc");
const { tao_kho_mongo } = require("../src/kho/mongo");
const { tao_dich_vu_mat_khau } = require("../src/dich_vu/mat_khau");
const { tao_dich_vu_nhat_ky } = require("../src/dich_vu/nhat_ky");
const { tao_log } = require("../src/tien_ich/che_log");
const {
  tao_du_lieu_mau,
  thong_ke_du_lieu_mau,
} = require("../src/du_lieu_mau/tao_du_lieu_mau");

function doc_tham_so(argv) {
  const kq = {
    so_luong: 200,
    hat_giong: 20261024,
    ngay: null,
    tai_khoan_mau: false,
    xoa: false,
    yes: false,
  };
  for (const a of argv) {
    let m;
    if ((m = /^--so-luong=(\d+)$/.exec(a))) kq.so_luong = Number(m[1]);
    else if ((m = /^--hat-giong=(\d+)$/.exec(a))) kq.hat_giong = Number(m[1]);
    else if ((m = /^--ngay-tham-chieu=(\d{4})-(\d{2})-(\d{2})$/.exec(a)))
      kq.ngay = new Date(
        Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])),
      );
    else if (a === "--kem-tai-khoan-mau") kq.tai_khoan_mau = true;
    else if (a === "--xoa") kq.xoa = true;
    else if (a === "--yes") kq.yes = true;
    else throw new Error(`Tham số không hiểu: ${a}`);
  }
  if (!Number.isInteger(kq.so_luong) || kq.so_luong < 1 || kq.so_luong > 5000)
    throw new Error("--so-luong phải từ 1 đến 5000");
  return kq;
}

async function chen_theo_lo(collection, ds, kich_thuoc = 100) {
  for (let i = 0; i < ds.length; i += kich_thuoc)
    await collection.insertMany(ds.slice(i, i + kich_thuoc), { ordered: true });
}

async function main() {
  const tham_so = doc_tham_so(process.argv.slice(2));
  nap_tep_env();
  const cau_hinh = doc_cau_hinh(process.env, { can_tls: false });
  const { client, db } = await ket_noi_mongo(cau_hinh.mongo);
  try {
    await kiem_tra_phien_ban_schema(db);
    const kho = tao_kho_mongo(db);
    const nhat_ky = tao_dich_vu_nhat_ky({ kho: kho.nhat_ky, log: tao_log() });
    // const hom_nay = new Date(); const ngay = tham_so.ngay || new Date(Date.UTC(hom_nay.getUTCFullYear(), hom_nay.getUTCMonth(), hom_nay.getUTCDate()));
    const ngay = tham_so.ngay || ngay_vn();
    const may = { ten: os.hostname(), ip: "127.0.0.1" };

    if (!tham_so.yes) {
      const lenh = tham_so.xoa
        ? "XÓA toàn bộ dữ liệu mẫu (la_mau: true)"
        : `XÓA dữ liệu mẫu cũ rồi NẠP ${tham_so.so_luong} hồ sơ mẫu (giả)`;
      const tra_loi = await hoi(
        `CSDL "${cau_hinh.mongo.csdl}": ${lenh}. Gõ "mau" để xác nhận`,
        "",
      );
      if (tra_loi.trim().toLowerCase() !== "mau") {
        console.log("Đã hủy, không thay đổi gì.");
        return;
      }
    }

    const xoa = {
      nhan_su: (await db.collection("nhan_su").deleteMany({ la_mau: true }))
        .deletedCount,
      nghi_phep: (await db.collection("nghi_phep").deleteMany({ la_mau: true }))
        .deletedCount,
      nguoi_dung: (
        await db.collection("nguoi_dung").deleteMany({ la_mau: true })
      ).deletedCount,
    };
    console.log(
      `Đã xóa dữ liệu mẫu cũ: nhan_su ${xoa.nhan_su}, nghi_phep ${xoa.nghi_phep}, nguoi_dung ${xoa.nguoi_dung}.`,
    );

    let da_nap = null;
    if (!tham_so.xoa) {
      const du_lieu = tao_du_lieu_mau({
        so_luong: tham_so.so_luong,
        hat_giong: tham_so.hat_giong,
        ngay_tham_chieu: ngay,
        tao_id: () => new ObjectId(),
      });
      try {
        await chen_theo_lo(db.collection("nhan_su"), du_lieu.nhan_su);
        await chen_theo_lo(db.collection("nghi_phep"), du_lieu.nghi_phep);
      } catch (loi) {
        if (loi.code === 121)
          console.error(
            `MongoDB từ chối tài liệu (validator): ${JSON.stringify(loi.errInfo && loi.errInfo.details ? loi.errInfo.details : loi.message).slice(0, 1500)}`,
          );
        throw loi;
      }
      da_nap = {
        so_nhan_su: du_lieu.nhan_su.length,
        so_nghi_phep: du_lieu.nghi_phep.length,
      };
      const tk = thong_ke_du_lieu_mau(du_lieu, du_lieu.ngay_tham_chieu);
      console.log(
        `Đã nạp ${tk.tong_nhan_su} hồ sơ và ${tk.tong_nghi_phep} bản ghi nghỉ phép (ngày tham chiếu ${du_lieu.ngay_tham_chieu.toISOString().slice(0, 10)}, seed ${tham_so.hat_giong}).`,
      );
      console.log(
        `  - hồ sơ có con dưới 6 tuổi: ${tk.nhan_su_co_con_duoi_6} (${tk.tong_con_duoi_6} cháu)`,
      );
      console.log(
        `  - kỷ luật còn hiệu lực: ${tk.ky_luat_con_hieu_luc}; đã hết hiệu lực: ${tk.ky_luat_het_hieu_luc}`,
      );
      console.log(
        `  - ngày chỉ có tháng/năm: ${tk.ngay_chi_co_thang_nam}; chỉ có năm: ${tk.ngay_chi_co_nam}; hồ sơ có tiền án/tiền sự (giả): ${tk.nhan_su_co_tien_an_tien_su}`,
      );

      if (tham_so.tai_khoan_mau) {
        const mk_dich_vu = tao_dich_vu_mat_khau({ cost: cau_hinh.bcrypt_cost });
        const bay_gio = new Date();
        const tai_khoan = [
          {
            ten_dang_nhap: "mau_xem_day_du",
            ten_hien_thi: "Mẫu · Xem đầy đủ",
            loai: LOAI_TAI_KHOAN.XEM_DAY_DU,
            muc_duoc_xem: [],
          },
          {
            ten_dang_nhap: "mau_xem_mot_so_muc",
            ten_hien_thi: "Mẫu · Xem một số mục",
            loai: LOAI_TAI_KHOAN.XEM_MOT_SO_MUC,
            muc_duoc_xem: ["lien_he", "khen_thuong"],
          },
        ];
        console.log(
          "\nTài khoản mẫu (mật khẩu chỉ hiện lần này, chỉ dùng thử):",
        );
        for (const t of tai_khoan) {
          const mk = crypto.randomBytes(12).toString("base64url");
          await kho.nguoi_dung.tao({
            ...t,
            mat_khau_bam: await mk_dich_vu.bam(mk),
            khoa: false,
            buoc_doi_mat_khau: false,
            so_lan_sai: 0,
            so_phien_token: 1,
            la_mau: true,
            created_at: bay_gio,
            updated_at: bay_gio,
          });
          console.log(`  ${t.ten_dang_nhap}  /  ${mk}`);
        }
      }
    }
    await nhat_ky.ghi({
      hanh_dong: HANH_DONG_NHAT_KY.SUA_DU_LIEU,
      ket_qua: KET_QUA_NHAT_KY.THANH_CONG,
      tai_khoan: { id: null, ten: "he_thong_cli" },
      may,
      chi_tiet: {
        muc: "du_lieu_mau",
        hanh_dong: tham_so.xoa ? "xoa" : "nap",
        da_xoa: xoa,
        da_nap,
      },
    });
  } finally {
    await client.close();
  }
}

main().catch((loi) => {
  console.error(`LỖI: ${loi.message}`);
  process.exit(1);
});
