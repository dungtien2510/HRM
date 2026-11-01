'use strict';
const express = require('express');
const { z } = require('zod');
const { HEADER } = require('@hrm/shared');
const { chuan_hoa_ip, chuan_hoa_ten_may } = require('../tien_ich/chuan_hoa');
const { ho_so_tai_khoan } = require('../dich_vu/phan_quyen');

const luoc_do_dang_nhap = z.object({
  ten_dang_nhap: z.string({ required_error: 'Chưa nhập tên đăng nhập', invalid_type_error: 'Tên đăng nhập không hợp lệ' })
    .trim().min(1, 'Chưa nhập tên đăng nhập').max(64, 'Tên đăng nhập quá dài'),
  mat_khau: z.string({ required_error: 'Chưa nhập mật khẩu', invalid_type_error: 'Mật khẩu không hợp lệ' })
    .min(1, 'Chưa nhập mật khẩu')
    .refine((s) => Buffer.byteLength(s, 'utf8') <= 72, 'Mật khẩu quá dài'),
}).strict();

function tao_tuyen_auth({ dich_vu_dang_nhap, xac_thuc }) {
  const router = express.Router();

  // POST /auth/login
  router.post('/login', async (req, res) => {
    const du_lieu = luoc_do_dang_nhap.parse(req.body);
    const ket_qua = await dich_vu_dang_nhap.dang_nhap({
      ten_dang_nhap: du_lieu.ten_dang_nhap,
      mat_khau: du_lieu.mat_khau,
      ip: chuan_hoa_ip(req.socket.remoteAddress),
      may: chuan_hoa_ten_may(req.get(HEADER.TEN_MAY)),
      phien_ban_ung_dung: req.phien_ban_ung_dung,
    });
    res.json(ket_qua);
  });

  // GET /auth/me
  router.get('/me', xac_thuc, (req, res) => {
    res.json({ tai_khoan: ho_so_tai_khoan(req.nguoi_dung) });
  });

  return router;
}

module.exports = { tao_tuyen_auth, luoc_do_dang_nhap };
