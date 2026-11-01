'use strict';
/**
 * Nâng cấp cấu trúc CSDL theo schema_version (chạy lại được; có kiểm tra trước khi chạy).
 *   npm run nang_cap_csdl --workspace server                       hỏi xác nhận rồi nâng cấp
 *   npm run nang_cap_csdl --workspace server -- --chi-kiem-tra      chỉ kiểm tra và in kế hoạch, không đổi gì
 *   npm run nang_cap_csdl --workspace server -- --yes               không hỏi xác nhận (tự động hóa)
 * Cần user quản trị MongoDB (vai trò dbOwner trên CSDL của ứng dụng); script sẽ đề nghị cấp nếu thiếu.
 */
const { chay_cli } = require('./lib/nang_cap_cli');

chay_cli({ tieu_de: '== Nâng cấp cấu trúc CSDL ==', argv: process.argv.slice(2) }).catch((loi) => {
  console.error(`LỖI: ${loi.message}`);
  process.exit(1);
});
