'use strict';
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, ipcMain, session, Menu, dialog } = require('electron');
const shared = require('@hrm/shared');
const { tao_cau_hinh_may } = require('./cau_hinh_may');
const { tao_api_khach } = require('./api_khach');
const { dang_ky_ipc } = require('./ipc');

// Giao diện do Vite build ra thư mục dist/renderer (npm run build:renderer; npm start tự build).
const DUONG_DAN_INDEX = path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');
const CHU_KY_KIEM_TRA_MS = 20_000;

let cua_so = null;
let dong_ho_kiem_tra = null;

function gui_su_kien(ten, du_lieu) {
  if (cua_so && !cua_so.isDestroyed()) cua_so.webContents.send('hrm:su_kien', { ten, du_lieu });
}

function bao_mat_phien_lam_viec() {
  session.defaultSession.setPermissionRequestHandler((_wc, _quyen, tra_loi) => tra_loi(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  app.on('web-contents-created', (_su_kien, noi_dung) => {
    noi_dung.on('will-navigate', (e) => e.preventDefault());
    noi_dung.on('will-attach-webview', (e) => e.preventDefault());
    noi_dung.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}

function tao_cua_so() {
  cua_so = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    backgroundColor: '#F3F5F7',
    title: 'HRM · Quản lý nhân sự',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false,
      devTools: !app.isPackaged,
    },
  });
  cua_so.once('ready-to-show', () => cua_so.show());
  cua_so.on('closed', () => { cua_so = null; });
  cua_so.loadFile(DUONG_DAN_INDEX);
}

function khoi_dong() {
  if (!fs.existsSync(DUONG_DAN_INDEX)) {
    dialog.showErrorBox('Chưa có giao diện', 'Chưa build giao diện. Hãy chạy "npm run build:renderer" (hoặc "npm start") trong thư mục app.');
    app.quit();
    return;
  }
  const cau_hinh_may = tao_cau_hinh_may(path.join(app.getPath('userData'), 'cau_hinh_may.json'));
  const api = tao_api_khach({
    lay_dia_chi: () => cau_hinh_may.doc().dia_chi_may_chu,
    phien_ban: app.getVersion(),
    ten_may: os.hostname(),
    tren_su_kien: gui_su_kien,
  });

  function bat_dau_kiem_tra_dinh_ky() {
    if (dong_ho_kiem_tra) clearInterval(dong_ho_kiem_tra);
    dong_ho_kiem_tra = setInterval(() => { api.kiem_tra_dinh_ky().catch(() => {}); }, CHU_KY_KIEM_TRA_MS);
    dong_ho_kiem_tra.unref();
  }

  dang_ky_ipc({
    ipcMain,
    api,
    cau_hinh_may,
    hang_so: {
      MUC_QUYEN: shared.MUC_QUYEN,
      LOAI_TAI_KHOAN: shared.LOAI_TAI_KHOAN,
      MA_LOI: shared.MA_LOI,
    },
    phien_ban_ung_dung: app.getVersion(),
    duong_dan_index: DUONG_DAN_INDEX,
    bat_dau_kiem_tra_dinh_ky,
  });

  if (app.isPackaged) Menu.setApplicationMenu(null);
  bao_mat_phien_lam_viec();
  tao_cua_so();
  if (cau_hinh_may.doc().dia_chi_may_chu) bat_dau_kiem_tra_dinh_ky();
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (cua_so) { if (cua_so.isMinimized()) cua_so.restore(); cua_so.focus(); }
  });
  app.whenReady().then(khoi_dong);
  app.on('window-all-closed', () => app.quit());
}
