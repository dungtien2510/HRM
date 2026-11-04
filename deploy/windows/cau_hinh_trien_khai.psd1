# ============================================================================
#  CẤU HÌNH TRIỂN KHAI — SỬA FILE NÀY trước khi chạy các script trong thư mục này.
#  Đường dẫn: <thư mục kho mã>\deploy\windows\cau_hinh_trien_khai.psd1
#  (mặc định: G:\Dung\lap_trinh\project\project_new\clau_AI\hrm\deploy\windows\cau_hinh_trien_khai.psd1)
#  Lưu ở dạng UTF-8 có BOM. Chỉ chứa dữ liệu (không viết lệnh) vào file này.
# ============================================================================
@{
    # Tên máy chủ: có trong chứng chỉ HTTPS và trong file hosts của máy làm việc.
    TenMayChu = 'hrm.tieudoantt.local'

    # >>> SỬA DÒNG NÀY: IP LAN thật của máy chủ.
    # Địa chỉ dưới đây chỉ là GIÁ TRỊ MẪU (giả). Khi còn để nguyên giá trị mẫu:
    #   - script 02 vẫn chạy (chứng chỉ vẫn hợp lệ cho 127.0.0.1 và tên máy chủ);
    #   - script may_lam_viec_cai_chung_chi.ps1 sẽ KHÔNG ghi file hosts (để khỏi trỏ nhầm tới địa chỉ giả).
    IpMayChu = '192.168.1.20'

    # IP các máy làm việc được phép kết nối tới API (tường lửa, script 06). Thêm/bớt tùy ý.
    # Cũng ghi được dạng dải '192.168.1.20-192.168.1.30' hoặc mạng con '192.168.1.0/24'.
    IpMayLamViec = @(
        '192.168.1.21'
        '192.168.1.22'
        '192.168.1.23'
    )

    # Cổng HTTPS của API (phải trùng CONG trong server\.env).
    CongApi = 8443

    # Đường dẫn tới nssm.exe: tải nssm-2.24.zip từ https://nssm.cc , giải nén, lấy win64\nssm.exe.
    DuongDanNssm = 'G:\Dung\lap_trinh\project\project_new\clau_AI\Tools\nssm\nssm.exe'
}
