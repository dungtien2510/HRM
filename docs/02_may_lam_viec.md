# Hướng dẫn cho máy làm việc (Windows 10 trở lên)

Máy làm việc chỉ chạy ứng dụng Electron; **không** cài MongoDB, **không** giữ mật khẩu CSDL, **không** lưu dữ liệu nhân sự xuống ổ đĩa (trừ file bạn chủ động xuất). Ứng dụng chỉ lưu một thứ trên máy: địa chỉ máy chủ (`%APPDATA%\HRM\cau_hinh_may.json`).

## 1. Tin cậy chứng chỉ gốc nội bộ và đặt tên máy chủ

Người quản trị đưa cho bạn file `hrm_goc.cer` (**chỉ file .cer, không bao giờ nhận file .pfx**), file cấu hình `cau_hinh_trien_khai.psd1` đã điền **IP máy chủ thật** (hoặc đọc IP đó cho bạn), và giá trị **SHA-256** của file `.cer` (đọc qua điện thoại hoặc gặp trực tiếp, không gửi cùng kênh với file).

Mở PowerShell **Run as administrator**:

```powershell
cd <thư mục>\deploy\windows
.\may_lam_viec_cai_chung_chi.ps1 -DuongDanCer C:\hrm_goc.cer -DauVanTay <SHA-256>
```
Script đối chiếu SHA-256, kiểm tra đây đúng là chứng chỉ CA, cài vào **Trusted Root** của máy, thêm dòng `<IpMayChu>  hrm.tieudoantt.local` vào file hosts (IP và tên lấy từ `cau_hinh_trien_khai.psd1`; có thể ghi đè bằng `-DiaChiMayChu <IP>`) rồi thử kết nối `https://hrm.tieudoantt.local:8443/health`. Nếu `IpMayChu` vẫn là địa chỉ mẫu, script **bỏ qua** việc ghi file hosts và cảnh báo.

Lưu ý: chứng chỉ gốc này chỉ nên dùng cho HRM. Máy làm việc phải nằm trong danh sách IP được phép ở tường lửa của máy chủ (mặc định 192.168.1.21–23).

## 2. Chạy ứng dụng (giai đoạn phát triển)

Cần Node.js LTS (≥ 22.12, vì Vite 7 yêu cầu). Từ thư mục gốc của kho mã:

```powershell
npm install          # cài thư viện cho shared, server, app (kéo cả Electron và Vite)
npm run app          # = npm start --workspace app: Vite build giao diện (JSX) vào app\dist\renderer rồi mở Electron
```
Giao diện viết bằng React + JSX, được **Vite** đóng gói thành file tĩnh trong `app\dist\renderer`; Electron nạp bằng `loadFile` (không có máy chủ web). Muốn chỉ build lại giao diện: `npm run build:renderer --workspace app`. Mỗi lần sửa giao diện cần chạy lại `npm run app` (chưa cấu hình chế độ tự nạp lại).

Đóng gói bản cài (`electron-builder`) và tự cập nhật (`electron-updater`) sẽ làm ở bước sau.

## 3. Lần chạy đầu

1. Màn hình **Kết nối tới máy chủ**: nhập `hrm.tieudoantt.local` (cổng mặc định 8443) → **Kiểm tra và lưu**. Ứng dụng gọi `/health` qua HTTPS và dùng kho chứng chỉ của Windows để kiểm tra chứng chỉ. Lỗi hiển thị bằng tiếng Việt kèm gợi ý:

   | Thông báo | Ý nghĩa |
   |---|---|
   | Máy này chưa tin cậy chứng chỉ của máy chủ | Chưa làm bước 1 |
   | Chứng chỉ không khớp với địa chỉ đã nhập | Nhập địa chỉ không có trong chứng chỉ |
   | Không tìm thấy máy chủ theo tên đã nhập | Thiếu dòng trong file hosts / sai chính tả |
   | Máy chủ từ chối kết nối | Dịch vụ HrmApi chưa chạy hoặc sai cổng |
   | Máy chủ không phản hồi kịp thời | Máy chủ tắt hoặc tường lửa chưa cho IP máy này |

2. Màn hình **Đăng nhập**: dùng tài khoản do admin cấp. Sai nhiều lần sẽ bị **khóa tạm** (mặc định 5 lần sai trong 15 phút theo tài khoản, 20 lần theo địa chỉ IP) và màn hình đếm ngược thời gian chờ.
3. **Khung chính**: menu bên trái theo mockup (Tổng quan, Hồ sơ nhân sự, Chấm công, Nghỉ phép, Lương & phúc lợi, Báo cáo & xuất file). Các trang hiện để trống. Menu ẩn mục theo quyền chỉ để gọn giao diện; **API mới là nơi chặn quyền thật sự**.
4. Mất mạng hoặc máy chủ tắt: banner đỏ "Mất kết nối máy chủ" kèm nguyên nhân và gợi ý, tự kiểm tra lại mỗi 20 giây, có nút **Thử lại ngay**.
5. Phiên bản ứng dụng thấp hơn mức tối thiểu của máy chủ: hiện màn hình **Cần cập nhật ứng dụng**.

Đổi máy chủ: ở màn hình đăng nhập bấm **Đổi máy chủ**.
