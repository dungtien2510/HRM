'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { chuan_hoa_dia_chi_may_chu } = require('./dia_chi_may_chu');

/**
 * Cấu hình riêng của máy làm việc. CHỈ lưu địa chỉ máy chủ — không lưu mật khẩu, token hay dữ liệu nhân sự
 * (quy định kiến trúc: không ghi dữ liệu nhân sự xuống ổ đĩa máy làm việc).
 */
function tao_cau_hinh_may(duong_dan) {
  function doc() {
    try {
      const doi_tuong = JSON.parse(fs.readFileSync(duong_dan, 'utf8'));
      const kq = chuan_hoa_dia_chi_may_chu(doi_tuong && doi_tuong.dia_chi_may_chu);
      return { dia_chi_may_chu: kq.ok ? kq.url : null };
    } catch {
      return { dia_chi_may_chu: null }; // chưa có file hoặc file hỏng → coi như chưa cấu hình
    }
  }
  function luu_dia_chi_may_chu(url) {
    const kq = chuan_hoa_dia_chi_may_chu(url);
    if (!kq.ok) throw new Error(kq.thong_diep);
    fs.mkdirSync(path.dirname(duong_dan), { recursive: true });
    const tam = `${duong_dan}.tmp`;
    fs.writeFileSync(tam, JSON.stringify({ phien: 1, dia_chi_may_chu: kq.url }, null, 2), 'utf8');
    fs.renameSync(tam, duong_dan); // ghi nguyên tử, tránh file dở dang khi mất điện
    return kq.url;
  }
  return Object.freeze({ doc, luu_dia_chi_may_chu });
}

module.exports = { tao_cau_hinh_may };
