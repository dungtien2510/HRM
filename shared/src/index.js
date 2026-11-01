'use strict';
/** Điểm vào của gói shared: gộp các module con. Mọi mã khác chỉ cần require('@hrm/shared'). */
module.exports = Object.freeze({
  ...require('./hang_so'),
  ...require('./ngay'),
  ...require('./tim_kiem'),
  ...require('./truong_du_lieu'),
  ...require('./chuan_hoa_nhan_su'),
});
