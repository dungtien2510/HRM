'use strict';
const crypto = require('node:crypto');
const { HEADER } = require('@hrm/shared');

/** Gắn mã yêu cầu (tự sinh, không tin giá trị từ máy khách) để đối chiếu log khi có lỗi. */
function ma_yeu_cau(req, res, next) {
  req.ma_yeu_cau = crypto.randomUUID();
  res.set(HEADER.MA_YEU_CAU, req.ma_yeu_cau);
  next();
}

/** Header an toàn cho API JSON. HSTS giúp trình duyệt/Chromium không bao giờ hạ xuống HTTP. */
function header_bao_mat(req, res, next) {
  res.set({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  next();
}

module.exports = { ma_yeu_cau, header_bao_mat };
