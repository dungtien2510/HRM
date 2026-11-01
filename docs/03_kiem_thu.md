# Kiểm thử Bước 1

## A. Kiểm thử tự động

Từ thư mục gốc (sau `npm install`):

```powershell
npm test                              # chạy cả ba gói
npm test --workspace shared
npm test --workspace server
npm test --workspace app
```
Dùng bộ chạy test có sẵn của Node (`node --test`), không cần thư viện thử nghiệm nào.

| Gói | Nội dung kiểm thử | Cần gì |
|---|---|---|
| `shared` — `hang_so` | 11 mục quyền (5 mục cuối nhạy cảm), loại tài khoản, so sánh phiên bản | Chỉ Node |
| `server` — `gioi_han_dang_nhap`, `dang_nhap.dich_vu` | Khóa theo tài khoản và theo IP, hết khóa, lượt bị chặn không kéo dài khóa, gửi song song không vượt ngưỡng, không lộ tài khoản có thật, nhật ký không chứa mật khẩu/token, đóng khi không ghi được nhật ký | Chỉ Node (kho bộ nhớ) |
| `server` — `phan_quyen`, `phien_ban.dich_vu`, `che_log`, `chuan_hoa` | Quyền theo loại tài khoản (xem_mot_so_muc luôn có thong_tin_co_ban, loại lạ bị từ chối), đọc phiên bản tối thiểu, che dữ liệu nhạy cảm trong log | Chỉ Node |
| `server` — `cau_hinh`, `mat_khau`, `ung_dung.http` | Cấu hình (chỉ HTTPS, MongoDB chỉ 127.0.0.1, bí mật không lộ trong thông báo lỗi), bcrypt, **toàn bộ API qua HTTP thật**: 426, 401/429, token giả/alg none/hết hạn/đổi phiên, JSON hỏng, trường thừa, chèn toán tử, quá lớn, lỗi nội bộ không lộ chi tiết | `npm install` (zod, bcrypt, express, jsonwebtoken) |
| `server` — `schema`, `du_lieu_mau`, `yeu_cau_buoc2` | JSON Schema sinh từ bảng khai báo (khớp 1-1, từng trường bắt buộc, ngày không đủ, địa chỉ, mảng nhúng); 200 hồ sơ mẫu đạt schema và đủ tình huống (con dưới 6 tuổi kể cả ca sát ranh giới, kỷ luật còn/hết hiệu lực, ngày chỉ có tháng/năm); chỉ mục và đặc quyền đúng yêu cầu (`nhat_ky` chỉ `find`+`insert`) | Chỉ Node |
| `server` — `cau_truc`, `nang_cap` | Tạo/ép cấu trúc idempotent (validator và chỉ mục lệch được sửa); bộ nâng cấp từ CSDL rỗng và từ cấu trúc Bước 1 (giữ `_id`, bản sao lưu, ngắt giữa chừng rồi chạy lại, kiểm tra trước chặn dữ liệu xấu/thiếu quyền/MongoDB cũ). Dùng CSDL giả có validator | Chỉ Node |
| `server` — `mongo.tich_hop` | **MongoDB thật**: validator chấp nhận 200 hồ sơ mẫu và từ chối tài liệu sai (mã 121), chỉ mục duy nhất/TTL/`hint`, projection theo mục, nâng cấp từ Bước 1, **đặc quyền thật** (user ứng dụng không sửa/xóa được `nhat_ky`, không gỡ được validator) | Đặt `HRM_TEST_MONGO_URI` (mặc định **bỏ qua**) |
| `shared` — `truong_du_lieu`, `ngay`, `tim_kiem`, `chuan_hoa_nhan_su`, `bang_truong_tai_lieu` | Bảng khai báo trường → mục quyền (mỗi trường đúng một mục, projection từng mục), ngày không đủ (tuổi, mốc "dưới N tuổi", hiệu lực kỷ luật), tìm kiếm bỏ dấu, chuẩn hóa hồ sơ, tài liệu bảng trường không lệch mã | Chỉ Node |
| `app` — `dia_chi_may_chu`, `loi_mang`, `cau_hinh_may`, `api_khach`, `ipc` | Chuẩn hóa địa chỉ (chỉ HTTPS), phân loại lỗi chứng chỉ/mạng, chỉ lưu địa chỉ máy chủ, token không lộ ra renderer, 401/426/429, báo mất kết nối, IPC chỉ nhận từ trang của ứng dụng và kiểm tra kiểu | Chỉ Node |
| `app` — `tien_ich` | Viết tắt tên, định dạng thời gian đếm ngược, menu theo quyền (hàm thuần của giao diện) | Chỉ Node |
| `app` — `giao_dien.smoke` | Biên dịch JSX bằng Vite (middleware + `ssrLoadModule`) rồi dựng từng màn hình ra HTML; kiểm tra chữ tiếng Việt và menu theo quyền | `vite`, `react`, `react-dom` (sau `npm install`) |

Chạy test tích hợp MongoDB (dùng CSDL tạm `hrm_test_<thời điểm>`, xóa sau khi xong; user cần quyền tạo CSDL, tạo role/user và `dbOwner`, ví dụ user quản trị MongoDB trên máy thử):

```powershell
$env:HRM_TEST_MONGO_URI = "mongodb://hrm_quan_tri_mongo:<mật_khẩu>@127.0.0.1:27017/?authSource=admin"
npm test --workspace server
```

## B. Thử bằng tay từ một máy khác trong mạng

Giả sử máy thử có IP **192.168.1.21** (nằm trong danh sách được phép), máy chủ là `hrm.tieudoantt.local`, và máy thử đã chạy `may_lam_viec_cai_chung_chi.ps1`. Windows 10 có sẵn `curl.exe` (dùng `curl.exe`, không phải `curl` vì PowerShell gán bí danh cho lệnh khác).

**1. Kết nối và chứng chỉ**
```powershell
curl.exe -i https://hrm.tieudoantt.local:8443/health
```
Mong đợi: `HTTP/1.1 200`, thân `{"trang_thai":"ok",...}`, không có cảnh báo chứng chỉ. Nếu chưa cài chứng chỉ gốc, `curl.exe` báo lỗi chứng chỉ (đúng như mong đợi).

**2. Kiểm tra phiên bản (426)**
```powershell
curl.exe -i https://hrm.tieudoantt.local:8443/auth/me                                   # thiếu header → 426 THIEU_PHIEN_BAN
curl.exe -i -H "X-HRM-App-Version: 0.0.1" https://hrm.tieudoantt.local:8443/auth/me      # thấp → 426 CAN_CAP_NHAT
curl.exe -i -H "X-HRM-App-Version: 0.1.0" https://hrm.tieudoantt.local:8443/auth/me      # đủ → 401 CHUA_DANG_NHAP
```
Nâng mức tối thiểu để xem màn hình "Cần cập nhật" của ứng dụng (chạy trên máy chủ, có hiệu lực trong ≤ 30 giây):
```powershell
npm run dat_phien_ban_toi_thieu --workspace server -- 0.2.0
npm run dat_phien_ban_toi_thieu --workspace server -- 0.1.0   # trả về như cũ
```

**3. Đăng nhập, `/auth/me`**
```powershell
curl.exe -s -X POST https://hrm.tieudoantt.local:8443/auth/login -H "Content-Type: application/json" -H "X-HRM-App-Version: 0.1.0" -d "{\"ten_dang_nhap\":\"admin\",\"mat_khau\":\"<mật khẩu>\"}"
curl.exe -s https://hrm.tieudoantt.local:8443/auth/me -H "X-HRM-App-Version: 0.1.0" -H "Authorization: Bearer <token>"
```
Mong đợi: `token`, `het_han_luc` (30 phút), `tai_khoan` với `muc_duoc_xem` đủ 11 mục; **không** có `mat_khau_bam`.

**4. Khóa tạm** — gửi sai mật khẩu 6 lần liên tiếp cho cùng một tên: lần 1–5 trả `401 SAI_THONG_TIN_DANG_NHAP` (cùng thông điệp dù tên có thật hay không), lần 6 trả `429 TAM_KHOA` kèm header `Retry-After` và `thu_lai_sau_giay`; lúc này mật khẩu đúng cũng bị từ chối. Sau 15 phút đăng nhập lại được. Thử thêm: đổi tên đăng nhập mỗi lần để chạm giới hạn theo IP (20 lần).

**5. Nhật ký** (trên máy chủ, cần `mongosh` hoặc Compass nếu bạn đã cài; hoặc xem ở bước quản trị sau này): collection `nhat_ky` có một bản ghi cho mỗi lần đăng nhập (thành công, thất bại, từ chối) với tài khoản, thời điểm, tên máy, IP. Không có mật khẩu, token. Tên gõ vào nhưng không tồn tại chỉ lưu dạng mã tham chiếu.

**6. Tường lửa và cổng**
- Từ máy có IP **không** nằm trong danh sách (ví dụ 192.168.1.50): `Test-NetConnection hrm.tieudoantt.local -Port 8443` → `TcpTestSucceeded : False` (hết thời gian chờ).
- Từ bất kỳ máy nào: `Test-NetConnection hrm.tieudoantt.local -Port 27017` → `False`.
- Thêm IP mới: chạy lại `06_thiet_lap_tuong_lua.ps1 -DiaChiChoPhep ...` trên máy chủ rồi thử lại.

**7. Chỉ HTTPS**: `curl.exe -i http://hrm.tieudoantt.local:8443/health` → kết nối bị đóng hoặc lỗi giao thức (API không có đường HTTP). `curl.exe -i http://hrm.tieudoantt.local/health` (cổng 80) → không kết nối được.

**8. Tự chạy khi bật máy**: khởi động lại máy chủ, **không đăng nhập Windows**, đợi 2 phút, từ máy thử gọi `/health` → `200`. (MongoDB lên trước vì HrmApi phụ thuộc vào nó.)

**9. Ứng dụng Electron**
1. Lần đầu: nhập `hrm.tieudoantt.local` → "Kết nối thành công". Thử nhập `http://…` → từ chối; nhập tên sai → "Không tìm thấy máy chủ"; khi chưa cài chứng chỉ gốc → "Máy này chưa tin cậy chứng chỉ".
2. Đăng nhập sai → thông báo chung; sai 6 lần → đếm ngược khóa.
3. Đăng nhập đúng → khung chính, tên và vai trò ở góc phải, các chip "mục được xem", menu 6 mục.
4. Tắt dịch vụ trên máy chủ (`Stop-Service HrmApi`) → trong ≤ 20 giây hiện banner đỏ "Mất kết nối máy chủ"; bật lại (`Start-Service HrmApi`) → banner biến mất sau lần kiểm tra kế tiếp hoặc khi bấm "Thử lại ngay".
5. `Stop-Service MongoDB` → banner vàng "Máy chủ đang gặp sự cố".
6. Nâng phiên bản tối thiểu lên 0.2.0 → lần gọi API kế tiếp (ví dụ đăng nhập) hiện màn hình "Cần cập nhật ứng dụng".
7. Đóng và mở lại ứng dụng: bạn phải đăng nhập lại (token chỉ nằm trong bộ nhớ). Kiểm tra `cau_hinh_may.json` chỉ chứa địa chỉ máy chủ.
