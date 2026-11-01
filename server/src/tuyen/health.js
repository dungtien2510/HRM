'use strict';
const express = require('express');

/** GET /health — không cần đăng nhập, không cần header phiên bản; chỉ báo tình trạng, không lộ chi tiết. */
function tao_tuyen_health({ kiem_tra_csdl, dong_ho = Date.now }) {
  const router = express.Router();
  router.get('/', async (req, res) => {
    let csdl_ok = false;
    try { csdl_ok = await kiem_tra_csdl(); } catch { csdl_ok = false; }
    res.status(csdl_ok ? 200 : 503).json({
      trang_thai: csdl_ok ? 'ok' : 'loi',
      thoi_diem: new Date(dong_ho()).toISOString(),
    });
  });
  return router;
}

module.exports = { tao_tuyen_health };
