# HRM — Phần mềm quản lý nhân sự

Nhiều máy Windows chạy **Electron + React** → **HTTPS** (mạng nội bộ) → **API Node.js + Express** (một máy chủ) → **MongoDB Community** (cùng máy chủ, chỉ nghe 127.0.0.1).

Trạng thái: **Bước 2 — thiết kế dữ liệu MongoDB** (trên nền Bước 1: hạ tầng, đăng nhập, khung ứng dụng). Có cấu trúc dữ liệu, bộ nâng cấp và dữ liệu mẫu; chưa có màn hình/API nghiệp vụ nhân sự.

```
hrm/
├─ shared/           hằng số; BẢNG KHAI BÁO trường → mục quyền (nguồn duy nhất) và projection; ngày không đủ; tim_kiem; chuẩn hóa hồ sơ
├─ server/           API Express (chỉ HTTPS) + script khởi tạo MongoDB và tạo admin
│  ├─ src/           cau_hinh · csdl (schema, chỉ mục, nâng cấp) · kho · dich_vu · trung_gian · tuyen · du_lieu_mau
│  ├─ scripts/       khoi_tao_mongo · khoi_tao_csdl · nang_cap_csdl · nap_du_lieu_mau · tao_admin · dat_phien_ban_toi_thieu
│  └─ test/
├─ app/              Electron: main (gọi API, giữ token) · preload (cầu nối hẹp) · renderer (React 18 + JSX, đóng gói bằng Vite)
├─ deploy/windows/   script PowerShell cài máy chủ + chứng chỉ máy làm việc; SỬA cau_hinh_trien_khai.psd1 (IP, NSSM) trước khi chạy
└─ docs/             01_may_chu_windows · 02_may_lam_viec · 03_kiem_thu · 04_cau_truc_du_lieu · bang_truong_muc_quyen
```

## Lệnh thường dùng
```powershell
npm install                 # cài mọi thư viện (npm workspaces)
npm test                    # chạy toàn bộ kiểm thử
npm run server              # chạy API (cần .env, MongoDB, chứng chỉ, CSDL đã khởi tạo — xem docs/01)
npm run khoi_tao_csdl --workspace server   # tạo/ép cấu trúc CSDL (chạy lại được); nang_cap_csdl: nâng cấp theo schema_version
npm run nap_du_lieu_mau --workspace server # nạp 200 hồ sơ mẫu giả để thử (xem docs/04)
npm run app                 # chạy ứng dụng Electron (xem docs/02)
```

## Nguyên tắc đã áp dụng ở bước này
- Quyền kiểm tra ở API; quyền lấy từ CSDL ở **mỗi** yêu cầu (đổi quyền, khóa tài khoản có hiệu lực ngay). Menu giao diện chỉ để gọn.
- Mật khẩu băm bcrypt (cost 12), JWT HS256 30 phút, giới hạn đăng nhập sai theo tài khoản và theo IP, khóa tạm.
- Mọi dữ liệu vào API qua zod; truy vấn MongoDB dùng đối tượng có tham số.
- `nhat_ky` chỉ ghi thêm (user ứng dụng chỉ có `find` + `insert` ở mức MongoDB); user ứng dụng không tạo/sửa được cấu trúc, chỉ mục, validator; không ghi mật khẩu, token, số căn cước chữ rõ.
- Mọi collection có JSON Schema validator **sinh từ bảng khai báo trường**; mục quyền, validator, projection, kiểm tra trường được phép lọc/sắp xếp đều dùng cùng một bảng.
- Electron: `contextIsolation`, `sandbox`, tắt `nodeIntegration`, CSP không cho renderer gọi mạng; token chỉ nằm trong bộ nhớ của tiến trình main.
- Chỉ dùng các thư viện trong danh sách cho phép (Electron, React, Express, mongodb, bcrypt, jsonwebtoken, zod) cùng **Vite** và **@vitejs/plugin-react** (được cho phép thêm sau Bước 1 để viết giao diện bằng JSX và đóng gói renderer). Công cụ ngoài: NSSM (dịch vụ Windows, đã được đồng ý).
