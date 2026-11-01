'use strict';
/**
 * Che dữ liệu nhạy cảm trước khi ghi log hoặc nhật ký (quy tắc 4):
 * mật khẩu, token, số căn cước, bí mật cấu hình không bao giờ xuất hiện dạng chữ rõ.
 */
const MAT_NA = '[da_che]';
const KHOA_NHAY_CAM = /(mat_khau|password|passwd|token|authorization|cookie|bi_mat|secret|pfx|can_cuoc|cccd|jwt)/i;
const MAU_JWT = /eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]*/g;
const MAU_BEARER = /Bearer\s+\S+/gi;
const MAU_SO_DAI = /\b\d{9,12}\b/g; // số căn cước / CMND dạng chữ rõ

function che_chuoi(s) {
  return s.replace(MAU_JWT, '[token]').replace(MAU_BEARER, 'Bearer [token]').replace(MAU_SO_DAI, '[so]');
}

function che(gia_tri, do_sau = 0) {
  if (do_sau > 6) return '[qua_sau]';
  if (gia_tri === null || gia_tri === undefined) return gia_tri;
  if (typeof gia_tri === 'string') return che_chuoi(gia_tri);
  if (typeof gia_tri !== 'object') return gia_tri;
  if (gia_tri instanceof Date) return gia_tri;
  if (gia_tri instanceof Error) {
    return { ten: gia_tri.name, thong_diep: che_chuoi(String(gia_tri.message)), ma: gia_tri.code ?? undefined };
  }
  if (Array.isArray(gia_tri)) return gia_tri.map((x) => che(x, do_sau + 1));
  const kq = {};
  for (const [khoa, v] of Object.entries(gia_tri)) {
    kq[khoa] = KHOA_NHAY_CAM.test(khoa) ? MAT_NA : che(v, do_sau + 1);
  }
  return kq;
}

/** Ghi log dạng JSON mỗi dòng ra stdout (dịch vụ Windows chuyển hướng vào file). */
function tao_log({ ghi = (dong) => process.stdout.write(`${dong}\n`), dong_ho = Date.now } = {}) {
  const viet = (muc, thong_diep, meta) => {
    const ban_ghi = {
      thoi_diem: new Date(dong_ho()).toISOString(),
      muc,
      thong_diep: che_chuoi(String(thong_diep)),
      ...(meta ? che(meta) : {}),
    };
    ghi(JSON.stringify(ban_ghi));
  };
  return Object.freeze({
    thong_tin: (t, m) => viet('thong_tin', t, m),
    canh_bao: (t, m) => viet('canh_bao', t, m),
    loi: (t, m) => viet('loi', t, m),
  });
}

module.exports = { che, che_chuoi, tao_log, MAT_NA };
