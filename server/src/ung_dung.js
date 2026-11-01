'use strict';
const express = require('express');
const { ma_yeu_cau, header_bao_mat } = require('./trung_gian/co_ban');
const { tao_trung_gian_phien_ban } = require('./trung_gian/phien_ban');
const { tao_trung_gian_xac_thuc } = require('./trung_gian/xac_thuc');
const { khong_tim_thay, tao_xu_ly_loi } = require('./trung_gian/loi');
const { tao_tuyen_health } = require('./tuyen/health');
const { tao_tuyen_auth } = require('./tuyen/auth');

/**
 * Lắp ráp ứng dụng Express từ các phụ thuộc đã tạo sẵn (để kiểm thử thay được kho dữ liệu).
 * deps: { log, kiem_tra_csdl, kho, kiem_tra_phien_ban, token, dich_vu_dang_nhap, dong_ho, them_tuyen? }
 * `them_tuyen` chỉ dành cho kiểm thử.
 */
function tao_ung_dung(deps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false); // API được truy cập trực tiếp, không qua proxy → req.socket.remoteAddress là IP thật

  app.use(ma_yeu_cau);
  app.use(header_bao_mat);

  // /health đặt trước kiểm tra phiên bản để ứng dụng cũ vẫn kiểm tra được kết nối.
  app.use('/health', tao_tuyen_health({ kiem_tra_csdl: deps.kiem_tra_csdl, dong_ho: deps.dong_ho }));

  app.use(tao_trung_gian_phien_ban({ kiem_tra: deps.kiem_tra_phien_ban }));
  app.use(express.json({ limit: '50kb', strict: true }));

  const xac_thuc = tao_trung_gian_xac_thuc({ token: deps.token, kho_nguoi_dung: deps.kho.nguoi_dung });
  app.use('/auth', tao_tuyen_auth({ dich_vu_dang_nhap: deps.dich_vu_dang_nhap, xac_thuc }));

  if (deps.them_tuyen) deps.them_tuyen(app, { xac_thuc });

  app.use(khong_tim_thay);
  app.use(tao_xu_ly_loi({ log: deps.log }));
  return app;
}

module.exports = { tao_ung_dung };
