'use strict';
/**
 * Khởi tạo CSDL: tạo 5 collection nghiệp vụ (nhan_su, nghi_phep, nguoi_dung, nhat_ky, cau_hinh) + luot_dang_nhap,
 * mỗi collection có JSON Schema validator và chỉ mục, cấu hình hệ thống mặc định và quyền tối thiểu cho user ứng dụng.
 * CHẠY LẠI NHIỀU LẦN KHÔNG HỎNG: thứ đã đúng thì bỏ qua, thứ lệch được ép lại. Với CSDL cũ (Bước 1) thì nó nâng cấp.
 * Cùng một bộ chạy với `npm run nang_cap_csdl` (khoi tao = nâng cấp từ trạng thái rỗng). Tùy chọn: --chi-kiem-tra, --yes.
 */
const { chay_cli } = require('./lib/nang_cap_cli');

chay_cli({ tieu_de: '== Khởi tạo CSDL ==', argv: process.argv.slice(2) }).catch((loi) => {
  console.error(`LỖI: ${loi.message}`);
  process.exit(1);
});
