'use strict';
const { z } = require('zod');
const { phan_tich_phien_ban } = require('@hrm/shared');

const so = (mac_dinh, nho_nhat, lon_nhat) =>
  z.coerce.number().int().min(nho_nhat).max(lon_nhat).default(mac_dinh);

const MAY_NOI_BO = ['127.0.0.1', 'localhost', '::1'];

const luoc_do = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).default('production'),
  DIA_CHI_LANG_NGHE: z.string().trim().min(1).default('0.0.0.0'),
  CONG: so(8443, 1, 65535),
  TLS_PFX: z.string().trim().optional(),
  TLS_PFX_MAT_KHAU: z.string().default(''),
  MONGO_MAY: z.enum(MAY_NOI_BO, {
    errorMap: () => ({ message: 'MongoDB chỉ được đặt trên chính máy chủ (127.0.0.1 hoặc localhost)' }),
  }).default('127.0.0.1'),
  MONGO_CONG: so(27017, 1, 65535),
  MONGO_CSDL: z.string().regex(/^[A-Za-z0-9_]{1,64}$/, 'Tên CSDL chỉ gồm chữ, số, gạch dưới').default('hrm_nhan_su'),
  MONGO_NGUOI_DUNG: z.string().min(1, 'Chưa khai báo MONGO_NGUOI_DUNG'),
  MONGO_MAT_KHAU: z.string().min(1, 'Chưa khai báo MONGO_MAT_KHAU'),
  JWT_BI_MAT: z.string().min(48, 'JWT_BI_MAT phải dài từ 48 ký tự trở lên'),
  JWT_HET_HAN_PHUT: so(30, 1, 480),
  BCRYPT_COST: so(12, 4, 15),
  DANG_NHAP_SAI_TOI_DA_TAI_KHOAN: so(5, 1, 20),
  DANG_NHAP_SAI_TOI_DA_IP: so(20, 1, 500),
  DANG_NHAP_CUA_SO_PHUT: so(15, 1, 1440),
  PHIEN_BAN_TOI_THIEU_MAC_DINH: z.string().default('0.1.0')
    .refine((v) => phan_tich_phien_ban(v) !== null, 'Phải có dạng x.y.z'),
});

/**
 * Đọc và kiểm tra cấu hình từ biến môi trường.
 * Thông báo lỗi chỉ nêu tên biến và lý do, không bao giờ in giá trị (có thể là bí mật).
 */
function doc_cau_hinh(env = process.env, { can_tls = true } = {}) {
  const kq = luoc_do.safeParse(env);
  const loi = kq.success ? [] : kq.error.issues.map((v) => `${v.path.join('.')}: ${v.message}`);
  if (kq.success && can_tls && !kq.data.TLS_PFX) loi.push('TLS_PFX: API chỉ phục vụ HTTPS, phải khai báo đường dẫn file .pfx');
  if (loi.length > 0) {
    throw new Error(`Cấu hình không hợp lệ:\n - ${loi.join('\n - ')}`);
  }
  const e = kq.data;
  return Object.freeze({
    moi_truong: e.NODE_ENV,
    dia_chi_lang_nghe: e.DIA_CHI_LANG_NGHE,
    cong: e.CONG,
    tls: Object.freeze({ pfx: e.TLS_PFX || null, mat_khau: e.TLS_PFX_MAT_KHAU }),
    mongo: Object.freeze({
      may: e.MONGO_MAY, cong: e.MONGO_CONG, csdl: e.MONGO_CSDL,
      nguoi_dung: e.MONGO_NGUOI_DUNG, mat_khau: e.MONGO_MAT_KHAU,
    }),
    jwt: Object.freeze({
      bi_mat: e.JWT_BI_MAT, het_han_phut: e.JWT_HET_HAN_PHUT, issuer: 'hrm-api', audience: 'hrm-app',
    }),
    bcrypt_cost: e.BCRYPT_COST,
    dang_nhap: Object.freeze({
      sai_toi_da_tai_khoan: e.DANG_NHAP_SAI_TOI_DA_TAI_KHOAN,
      sai_toi_da_ip: e.DANG_NHAP_SAI_TOI_DA_IP,
      cua_so_ms: e.DANG_NHAP_CUA_SO_PHUT * 60 * 1000,
    }),
    phien_ban_toi_thieu_mac_dinh: e.PHIEN_BAN_TOI_THIEU_MAC_DINH,
  });
}

module.exports = { doc_cau_hinh };
