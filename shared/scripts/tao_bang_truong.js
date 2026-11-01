'use strict';
/**
 * Sinh docs/bang_truong_muc_quyen.md từ bảng khai báo trường (nguồn duy nhất) để tài liệu luôn đúng với mã.
 *   npm run bang_truong --workspace shared
 * Có test (test/bang_truong_tai_lieu.test.js) so sánh file này với kết quả sinh → quên chạy lại sẽ báo lỗi.
 */
const fs = require('node:fs');
const path = require('node:path');
const { BANG_TRUONG, MUC_QUYEN } = require('../src/index.js');

const TEN_MUC = Object.fromEntries(MUC_QUYEN.map((m) => [m.ma, m]));

function nhan_kieu(k) {
  switch (k.kieu) {
    case 'chuoi': return `chuỗi (≤ ${k.toi_da || 300})`;
    case 'so': return 'số';
    case 'so_nguyen': return 'số nguyên';
    case 'tien': return 'tiền (VND)';
    case 'bool': return 'đúng/sai';
    case 'ngay': return 'ngày';
    case 'ngay_kdd': return 'ngày không đủ';
    case 'dia_chi': return 'địa chỉ';
    case 'enum': return `một trong: ${k.gia_tri.map((g) => `\`${g}\``).join(', ')}`;
    case 'co_mo_ta': return 'có/không + mô tả';
    case 'object_id': return 'ObjectId';
    case 'ket_hon': return 'kết hôn/ly hôn + năm';
    case 'mang': return `mảng (≤ ${k.toi_da_phan_tu || '∞'} phần tử)`;
    default: return k.kieu;
  }
}

const mo_ta_muc = (ma) => (ma === 'ky_thuat' ? 'kỹ thuật' : `\`${ma}\``);
const nhay_cam = (ma) => (TEN_MUC[ma] && TEN_MUC[ma].nhay_cam ? '●' : '');
const bat_buoc = (k) => ({ csdl: 'CSDL', nghiep_vu: 'biểu mẫu' }[k.bb] || '');

function ghi_chu(k) {
  const g = [];
  if (k.noi_bo) g.push('nội bộ, không trả ra');
  if (k.co_khong) g.push('có thể là "Không"');
  if (k.mau) g.push(`mẫu \`${k.mau}\``);
  return g.join('; ');
}

function dong(duong_dan, k) {
  return `| \`${duong_dan}\` | ${nhan_kieu(k)} | ${mo_ta_muc(k.muc)} | ${nhay_cam(k.muc)} | ${bat_buoc(k)} | ${ghi_chu(k)} |`;
}

function bang_cua(collection) {
  const dong_ds = [];
  const duyet = (truong, tien_to) => {
    for (const [ten, k] of Object.entries(truong)) {
      const duong_dan = tien_to ? `${tien_to}.${ten}` : ten;
      if (k.kieu === 'mang') { dong_ds.push(dong(`${duong_dan}[]`, k)); duyet(k.truong, `${duong_dan}[]`); } else dong_ds.push(dong(duong_dan, k));
    }
  };
  duyet(BANG_TRUONG[collection].truong, '');
  return dong_ds;
}

function tao_noi_dung() {
  const kq = [
    '# Bảng trường dữ liệu → mục quyền',
    '',
    '> **File này do `shared/scripts/tao_bang_truong.js` sinh từ `shared/src/truong_du_lieu.js` (nguồn duy nhất). Không sửa tay.** Chạy lại: `npm run bang_truong --workspace shared`.',
    '',
    '- **Mục** là một trong 11 mục quyền hoặc "kỹ thuật" (trường hệ thống, ai đọc được hồ sơ cũng thấy). `●` = mục nhạy cảm (`nghi_phep`, `luong`, `ky_luat`, `tien_an_tien_su`, `so_can_cuoc`).',
    '- **Bắt buộc**: *CSDL* = validator của MongoDB từ chối nếu thiếu; *biểu mẫu* = bắt buộc theo SYLL, kiểm ở API/giao diện (dùng để đếm "thiếu trường").',
    '- Trường kiểu mảng (`than_nhan[]`…) là tài liệu nhúng; mỗi phần tử có `id`, và **mỗi trường con có mục quyền riêng** (vd căn cước của thân nhân thuộc `so_can_cuoc`, tiền án của thân nhân thuộc `tien_an_tien_su`).',
    '- Trường chữ chưa khai = `null`/vắng mặt; đã khai là không = chuỗi `Không`. Ngày không đủ = `{nam, thang?, ngay?, ngay_chuan_hoa, do_chinh_xac}`.',
    '',
  ];
  for (const collection of Object.keys(BANG_TRUONG)) {
    kq.push(`## Collection \`${collection}\``, '', '| Đường dẫn | Kiểu | Mục | NC | Bắt buộc | Ghi chú |', '|---|---|---|---|---|---|', ...bang_cua(collection), '');
  }
  return `${kq.join('\n')}\n`;
}

if (require.main === module) {
  const dich = path.join(__dirname, '..', '..', 'docs', 'bang_truong_muc_quyen.md');
  fs.writeFileSync(dich, tao_noi_dung(), 'utf8');
  console.log(`Đã ghi ${path.relative(process.cwd(), dich)}`);
}

module.exports = { tao_noi_dung };
