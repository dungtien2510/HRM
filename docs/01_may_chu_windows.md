# Hướng dẫn cài máy chủ Windows (MongoDB + API HTTPS)

> **Trạng thái kiểm chứng:** các script PowerShell trong `deploy/windows/` được viết theo tài liệu của Microsoft/MongoDB nhưng **chưa được chạy thử trên Windows thật** (môi trường soạn thảo không có Windows/PowerShell). Hãy chạy lần đầu trên máy thử hoặc đọc kỹ từng bước. Mỗi script dừng ngay khi gặp lỗi và nói rõ lý do. Các file `.ps1` phải giữ mã hóa **UTF-8 có BOM** (Windows PowerShell 5.1 cần BOM để đọc đúng tiếng Việt); nếu sửa bằng trình soạn thảo khác, hãy lưu lại đúng kiểu mã hóa này.

## 0. Yêu cầu

| Hạng mục | Yêu cầu |
|---|---|
| Hệ điều hành | Windows 10 22H2 Pro trở lên (hoặc Windows 11 Pro / Windows Server 2019, 2022). **Windows 7 không dùng được.** |
| Phần cứng | 4 nhân CPU, RAM 4 GB (khuyến nghị 8 GB), SSD 256 GB, ổ/thư mục sao lưu tách riêng |
| Phần mềm | Node.js LTS (≥ 22), MongoDB Community Server (file `.msi`, Windows x64), NSSM (`nssm.exe`) |
| Mã hóa ổ đĩa | Bật BitLocker cho ổ chứa `C:\HRM` (MongoDB Community không mã hóa dữ liệu trên đĩa) |
| Mạng | IP tĩnh hoặc DHCP reservation cho máy chủ |

Cấu trúc thư mục trên máy chủ (do các script tạo):

```
C:\HRM\hrm\                    mã nguồn (chép cả thư mục hrm/ vào đây)
C:\HRM\du_lieu\mongodb\        dữ liệu MongoDB
C:\HRM\nhat_ky_he_thong\       log MongoDB và log API
C:\HRM\chung_chi\              chứng chỉ (hrm_goc.cer công khai; các file .pfx là BÍ MẬT)
C:\HRM\sao_luu\                (dành cho bước sao lưu sau này)
```

Mở **PowerShell bằng "Run as administrator"** rồi chạy các bước theo thứ tự. Nếu PowerShell chặn script: `Set-ExecutionPolicy -Scope Process Bypass` (chỉ có hiệu lực trong cửa sổ này).

```powershell
cd C:\HRM\hrm\deploy\windows
```

## Trước khi chạy: sửa file cấu hình triển khai

Mọi địa chỉ và đường dẫn cần chỉnh nằm trong **một file duy nhất**:

```
C:\HRM\hrm\deploy\windows\cau_hinh_trien_khai.psd1
```
Mở bằng Notepad (chạy bằng quyền Administrator), sửa rồi lưu — **giữ mã hóa UTF-8 có BOM** (ở hộp thoại *Save as* của Notepad chọn Encoding = "UTF-8 with BOM").

| Khóa | Giá trị mặc định | Ý nghĩa |
|---|---|---|
| `TenMayChu` | `hrm.tieudoantt.local` | Tên có trong chứng chỉ HTTPS và trong file hosts của máy làm việc |
| `IpMayChu` | `192.168.1.20` — **địa chỉ MẪU (giả), hãy sửa** | IP LAN thật của máy chủ |
| `IpMayLamViec` | `192.168.1.21`, `.22`, `.23` | Các máy làm việc được phép kết nối (tường lửa) |
| `CongApi` | `8443` | Cổng HTTPS của API (phải trùng `CONG` trong `.env`) |
| `DuongDanNssm` | `C:\Tools\nssm\nssm.exe` | Nơi đặt `nssm.exe` (xem bước 05) |

Khi `IpMayChu` còn là địa chỉ mẫu: script 02 vẫn chạy (chứng chỉ vẫn hợp lệ cho `127.0.0.1` và tên máy chủ) và cảnh báo; script `may_lam_viec_cai_chung_chi.ps1` **bỏ qua** việc ghi file hosts để khỏi trỏ tên máy chủ tới địa chỉ giả. Muốn dùng thử trên một máy duy nhất thì chưa cần sửa gì — nhập `127.0.0.1` trong ứng dụng. Khi có IP thật: sửa file, chạy lại script 02 (cấp lại chứng chỉ máy chủ, máy làm việc **không** phải cài lại chứng chỉ gốc), `Restart-Service HrmApi`, rồi chạy `may_lam_viec_cai_chung_chi.ps1` trên từng máy làm việc.

## Bước 00 — Kiểm tra máy chủ

```powershell
.\00_kiem_tra_may_chu.ps1
```
Báo phiên bản Windows, RAM, Node.js, cổng 27017/8443 đang trống hay không, có NSSM chưa. Không thay đổi gì.

## Bước 01 — Cài MongoDB, chỉ lắng nghe 127.0.0.1, bật xác thực

Tải `mongodb-windows-x86_64-<phiên bản>.msi` từ trang MongoDB Community Server, rồi:

```powershell
.\01_cai_mongodb.ps1 -DuongDanMsi C:\Tai\mongodb-windows-x86_64-8.0.x-signed.msi
```
Script: kiểm tra chữ ký số của file `.msi` và in SHA-256 để bạn đối chiếu; cài dịch vụ **MongoDB** (không cài Compass); ghi `mongod.cfg` với `bindIp: 127.0.0.1` và `authorization: enabled`; đặt dịch vụ tự chạy khi bật máy và tự khởi động lại khi lỗi; kiểm tra cổng 27017 **chỉ** nghe trên 127.0.0.1.

## Bước 02 — Chứng chỉ nội bộ

```powershell
.\02_tao_chung_chi.ps1                                       # đọc TenMayChu và IpMayChu từ cau_hinh_trien_khai.psd1
.\02_tao_chung_chi.ps1 -DiaChiIpThem 192.168.1.20,10.0.0.5   # (tùy chọn) chỉ định IP khác, ghi đè file cấu hình
```
Tạo CA nội bộ (10 năm) và chứng chỉ máy chủ (2 năm) có SAN: tên máy chủ, `localhost`, `127.0.0.1` và `IpMayChu`. Kết quả trong `C:\HRM\chung_chi\`:

| File | Vai trò | Ghi chú |
|---|---|---|
| `hrm_goc.cer` | Chứng chỉ gốc (công khai) | Phát cho máy làm việc |
| `hrm_goc.pfx` | **Khóa riêng của CA** | Cất ngoại tuyến (USB ở tủ an toàn). Chỉ cần khi cấp lại chứng chỉ máy chủ |
| `hrm_may_chu.pfx` | Chứng chỉ + khóa của máy chủ | API đọc file này |

**Cấp lại chứng chỉ máy chủ** (hết hạn hoặc đổi IP): chạy lại script này; nó nhận ra `hrm_goc.pfx` và dùng CA cũ nên máy làm việc **không phải cài lại** chứng chỉ gốc. Sau đó chạy bước 03 với `-GhiDe` (hoặc chỉ sửa `TLS_PFX_MAT_KHAU` trong `.env`) và khởi động lại dịch vụ.

### Phương án B (nếu `New-SelfSignedCertificate` báo lỗi, cần OpenSSL)

```powershell
openssl genrsa -aes256 -out hrm_goc.key 3072
openssl req -x509 -new -key hrm_goc.key -sha256 -days 3650 -subj "/O=HRM/CN=HRM Noi Bo - CA goc" -addext "basicConstraints=critical,CA:TRUE,pathlen:0" -addext "keyUsage=critical,keyCertSign,cRLSign" -out hrm_goc.pem
openssl req -new -newkey rsa:2048 -nodes -keyout hrm_may_chu.key -subj "/CN=hrm.tieudoantt.local" -out hrm_may_chu.csr
# file san.cnf chứa:  subjectAltName=DNS:hrm.tieudoantt.local,DNS:localhost,IP:127.0.0.1
#                     extendedKeyUsage=serverAuth
#                     keyUsage=digitalSignature,keyEncipherment
openssl x509 -req -in hrm_may_chu.csr -CA hrm_goc.pem -CAkey hrm_goc.key -CAcreateserial -days 730 -sha256 -extfile san.cnf -out hrm_may_chu.pem
openssl x509 -in hrm_goc.pem -outform der -out hrm_goc.cer
openssl pkcs12 -export -inkey hrm_may_chu.key -in hrm_may_chu.pem -out hrm_may_chu.pfx
```
Sau đó tự tạo file `C:\HRM\chung_chi\.pfx_mat_khau` chứa mật khẩu của `hrm_may_chu.pfx` (một dòng) để bước 03 dùng.

## Bước 03 — Tạo file `.env`

```powershell
.\03_tao_tep_env.ps1
```
Sinh `server\.env` từ `.env.example` với `JWT_BI_MAT` và mật khẩu MongoDB của ứng dụng ngẫu nhiên, quyền truy cập chỉ cho Administrators, SYSTEM và (chỉ đọc) tài khoản chạy API. `.env` **không bao giờ được commit**. Xóa file `.pfx_mat_khau` sau khi dùng.

## Bước 04 — Tạo user MongoDB và tài khoản admin ứng dụng

```powershell
.\04_khoi_tao_csdl_va_admin.ps1
```
Chạy `npm install --omit=dev` (chỉ `server` và `shared`), rồi ba lệnh tương tác:

1. `npm run khoi_tao_mongo` — hỏi tên và mật khẩu **user quản trị MongoDB** (chỉ quản lý user/role). Tạo vai trò `vai_tro_hrm_ung_dung` và user ứng dụng `hrm_ung_dung` với quyền tối thiểu trên **đúng một CSDL** (`hrm_nhan_su`); riêng `nhat_ky` chỉ được `find` và `insert` (chỉ ghi thêm, ép ở mức MongoDB).
2. `npm run khoi_tao_csdl` — hỏi lại user quản trị MongoDB, rồi tạo **6 collection** (`nhan_su`, `nghi_phep`, `nguoi_dung`, `nhat_ky`, `cau_hinh` và bộ đếm `luot_dang_nhap`) kèm JSON Schema validator, chỉ mục và cấu hình hệ thống. Chạy lại bao nhiêu lần cũng được. Nếu user quản trị thiếu quyền `dbOwner` trên CSDL của ứng dụng, script sẽ hỏi có cấp không. Chi tiết: `docs/04_cau_truc_du_lieu.md`.
3. `npm run tao_admin` — tạo **tài khoản admin duy nhất** của ứng dụng (mật khẩu từ 12 ký tự, ≤ 72 byte).

> Máy chủ không có Internet? `bcrypt` cần tải bản dựng sẵn khi cài. Chạy `npm install --omit=dev --workspace server --workspace shared` ở máy có mạng (cùng Windows x64, cùng phiên bản Node), chép `node_modules` sang rồi chạy script với `-BoQuaCaiThuVien`.

Mỗi bước sau thêm collection mới thì cập nhật `server/src/kho/danh_sach_collection.js` (quyền) và `server/src/csdl/chi_muc.js` (danh sách, chỉ mục), rồi chạy lại `npm run nang_cap_csdl --workspace server` (cập nhật cả cấu trúc lẫn vai trò).

> **Từ Bước 2, API không còn tự tạo chỉ mục hay collection khi khởi động** và từ chối chạy nếu `schema_version` của CSDL khác phiên bản mã nguồn. Sau mỗi lần cập nhật mã nguồn có thay đổi cấu trúc dữ liệu: chạy `npm run nang_cap_csdl --workspace server`, rồi `Restart-Service HrmApi`.

## Bước 05 — Chạy API như dịch vụ Windows

`node.exe` không tự là dịch vụ, nên dùng **NSSM** (công cụ ngoài, không phải thư viện npm; bạn đã đồng ý dùng). Chuẩn bị một lần:

1. Tải `nssm-2.24.zip` từ https://nssm.cc/download (đối chiếu tính toàn vẹn theo trang tải nếu có).
2. Giải nén, chép `win64\nssm.exe` vào `C:\Tools\nssm\nssm.exe` (hoặc đặt chỗ khác và sửa `DuongDanNssm` trong `cau_hinh_trien_khai.psd1`).

```powershell
.\05_cai_dich_vu_api.ps1
```
Tạo dịch vụ **HrmApi**: tự chạy khi bật máy, phụ thuộc dịch vụ MongoDB (MongoDB lên trước), tự khởi động lại sau 5 giây khi lỗi, chạy bằng tài khoản **LocalService** (quyền thấp), log xoay vòng ở `C:\HRM\nhat_ky_he_thong\api\`.

Không muốn dùng NSSM: thêm `-CachChay Tac_vu_hen_gio` (Task Scheduler, chạy lúc khởi động bằng LocalService). Khác biệt: không phải dịch vụ đúng nghĩa và không tự ghi stdout ra file.

Quản lý: `Restart-Service HrmApi`, `Get-Content C:\HRM\nhat_ky_he_thong\api\api.log -Tail 50`.

## Bước 06 — Tường lửa: chỉ cho các máy làm việc

```powershell
.\06_thiet_lap_tuong_lua.ps1        # đọc IpMayLamViec và CongApi từ cau_hinh_trien_khai.psd1
```
Đổi danh sách địa chỉ: **cách bền nhất là sửa `IpMayLamViec` trong `cau_hinh_trien_khai.psd1` rồi chạy lại script**. Có thể ghi đè tạm bằng tham số (chạy lại là cập nhật quy tắc cũ, không tạo thêm):

```powershell
.\06_thiet_lap_tuong_lua.ps1 -DiaChiChoPhep 192.168.1.21,192.168.1.22,192.168.1.30
.\06_thiet_lap_tuong_lua.ps1 -DiaChiChoPhep 192.168.1.20-192.168.1.30       # dạng dải
.\06_thiet_lap_tuong_lua.ps1 -DiaChiChoPhep 192.168.1.0/24                  # cả mạng con
```
Script từ chối `Any`/`0.0.0.0`, tạo quy tắc **chặn tường minh** cổng 27017 với mọi địa chỉ ngoài loopback, và cảnh báo nếu có quy tắc "cho phép" nào khác gắn với `node.exe` (Windows tự tạo khi bạn bấm "Allow" ở hộp thoại lúc chạy thử `npm start` bằng tay — hãy bấm **Cancel**, hoặc tắt quy tắc đó).

## Bước 07 — Kiểm tra sau cài đặt

```powershell
.\07_kiem_tra_sau_cai_dat.ps1
```
Kiểm tra: hai dịch vụ chạy và tự khởi động; MongoDB chỉ nghe 127.0.0.1; API nghe 8443 và không mở cổng nào khác; quy tắc tường lửa; `GET /health` qua HTTPS. Để bước cuối đạt, máy chủ phải tin cậy `hrm_goc.cer`: chạy `may_lam_viec_cai_chung_chi.ps1 -DuongDanCer C:\HRM\chung_chi\hrm_goc.cer` ngay trên máy chủ.

## Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Dịch vụ HrmApi dừng ngay sau khi chạy | `.env` thiếu/sai (`Cấu hình không hợp lệ: …` trong `api.log`) | Sửa `.env` rồi `Restart-Service HrmApi` |
| `api.log` báo "Cấu trúc CSDL chưa đúng phiên bản" | Chưa chạy (hoặc quên chạy lại) khởi tạo/nâng cấp CSDL | `npm run nang_cap_csdl --workspace server` rồi `Restart-Service HrmApi` |
| `Không khởi động được API` + lỗi xác thực MongoDB | Chưa chạy bước 04 hoặc `MONGO_MAT_KHAU` khác với mật khẩu đã tạo | Chạy `npm run khoi_tao_mongo` lại (cập nhật mật khẩu user ứng dụng theo `.env`) |
| API không đọc được `.pfx` | Sai mật khẩu PFX hoặc LocalService thiếu quyền đọc | Chạy lại bước 05 (cấp quyền), kiểm tra `TLS_PFX_MAT_KHAU` |
| Máy làm việc báo "chưa tin cậy chứng chỉ" | Chưa cài `hrm_goc.cer` | Chạy `may_lam_viec_cai_chung_chi.ps1` trên máy đó |
| Máy làm việc báo "không khớp địa chỉ" | Nhập địa chỉ không có trong SAN của chứng chỉ | Dùng `hrm.tieudoantt.local` hoặc cấp lại chứng chỉ với `-DiaChiIpThem` |
| Máy làm việc báo "không phản hồi kịp thời" | Tường lửa chưa cho IP của máy đó | Chạy lại bước 06 với IP đúng |
| Hết hạn chứng chỉ máy chủ | Quá 2 năm | Xem "Cấp lại chứng chỉ máy chủ" ở bước 02 |
| Script cảnh báo "IpMayChu đang là địa chỉ MẪU" | Chưa sửa `cau_hinh_trien_khai.psd1` | Điền IP LAN thật của máy chủ rồi chạy lại script 02 |
| Script 05 báo "Không thấy nssm.exe" | Chưa đặt `nssm.exe` đúng chỗ | Xem hướng dẫn NSSM ở bước 05 |
