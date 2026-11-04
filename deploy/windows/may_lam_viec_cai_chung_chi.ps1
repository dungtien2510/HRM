#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Chạy trên MÁY LÀM VIỆC (và có thể cả máy chủ): tin cậy chứng chỉ gốc nội bộ của HRM và thêm tên máy chủ vào hosts.
.DESCRIPTION
  Chép hrm_goc.cer (chỉ file .cer, KHÔNG bao giờ chép .pfx) từ máy chủ sang máy này, rồi chạy:
    .\may_lam_viec_cai_chung_chi.ps1 -DuongDanCer G:\Dung\lap_trinh\project\project_new\clau_AI\hrm_goc.cer -DauVanTay <SHA-256 người quản trị đọc cho bạn>   (IP máy chủ lấy từ cau_hinh_trien_khai.psd1; hoặc thêm -DiaChiMayChu <IP>)
  Chứng chỉ gốc này chỉ nên dùng cho HRM: ai giữ khóa riêng của CA đều có thể cấp chứng chỉ "hợp lệ" cho máy này.
#>
param(
    [Parameter(Mandatory = $true)][string]$DuongDanCer,
    [string]$DiaChiMayChu,             # mặc định: IpMayChu trong cau_hinh_trien_khai.psd1 (bỏ qua nếu còn là IP mẫu)
    [string]$TenMay,                   # mặc định: TenMayChu trong cau_hinh_trien_khai.psd1
    [string]$DauVanTay = '',
    [int]$Cong                         # mặc định: CongApi trong cau_hinh_trien_khai.psd1
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri
$cfg = Doc-CauHinhTrienKhai
if (-not $PSBoundParameters.ContainsKey('TenMay')) { $TenMay = $cfg.TenMayChu }
if (-not $PSBoundParameters.ContainsKey('Cong')) { $Cong = $cfg.CongApi }
if (-not $PSBoundParameters.ContainsKey('DiaChiMayChu')) {
    if ($cfg.IpMayChuLaGiaTriMau) {
        Ghi-Canh-Bao "IpMayChu trong cau_hinh_trien_khai.psd1 vẫn là địa chỉ MẪU ($($cfg.IpMayChu)) — bỏ qua bước ghi file hosts. Sửa file cấu hình rồi chạy lại, hoặc truyền -DiaChiMayChu <IP thật>."
        $DiaChiMayChu = ''
    } else { $DiaChiMayChu = [string]$cfg.IpMayChu }
}

Ghi-Buoc 'Kiểm tra file chứng chỉ'
if (-not (Test-Path -LiteralPath $DuongDanCer)) { Dung-Loi "Không thấy file: $DuongDanCer" }
if ($DuongDanCer -match '\.pfx$') { Dung-Loi 'Đây là file .pfx (chứa khóa riêng). Chỉ chép file hrm_goc.cer sang máy làm việc.' }
$hash = (Get-FileHash -LiteralPath $DuongDanCer -Algorithm SHA256).Hash
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($DuongDanCer)
Write-Host "  Chủ thể : $($cert.Subject)"
Write-Host "  Hết hạn : $($cert.NotAfter.ToString('dd/MM/yyyy'))"
Write-Host "  SHA-256 : $hash"
if ($DauVanTay) {
    if ($DauVanTay.Replace(' ', '').ToUpper() -ne $hash) { Dung-Loi 'SHA-256 KHÔNG khớp với giá trị bạn cung cấp. Dừng lại — file có thể bị thay đổi.' }
    Ghi-Ok 'SHA-256 khớp giá trị người quản trị cung cấp'
} else {
    $xacNhan = Read-Host 'Giá trị SHA-256 ở trên có khớp với giá trị người quản trị đọc cho bạn không? (gõ "co" để tiếp tục)'
    if ($xacNhan -ne 'co') { Dung-Loi 'Đã hủy.' }
}
$bc = $cert.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.19' }
if (-not $bc -or -not ([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]$bc).CertificateAuthority) { Dung-Loi 'File này không phải chứng chỉ CA.' }

Ghi-Buoc 'Tin cậy chứng chỉ gốc (kho Trusted Root của máy)'
$daCo = Get-ChildItem Cert:\LocalMachine\Root | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if ($daCo) { Ghi-Ok 'Máy này đã tin cậy chứng chỉ gốc từ trước.' }
else { Import-Certificate -FilePath $DuongDanCer -CertStoreLocation Cert:\LocalMachine\Root | Out-Null; Ghi-Ok 'Đã cài vào Trusted Root (LocalMachine)' }

if ($DiaChiMayChu) {
    Ghi-Buoc "Thêm $TenMay vào file hosts"
    $thu = $null
    if (-not [System.Net.IPAddress]::TryParse($DiaChiMayChu, [ref]$thu)) { Dung-Loi "IP máy chủ không hợp lệ: $DiaChiMayChu" }
    $hosts = "$env:SystemRoot\System32\drivers\etc\hosts"
    $dong = @(Get-Content -LiteralPath $hosts | Where-Object { $_ -notmatch "\s$([regex]::Escape($TenMay))(\s|$)" })
    $dong += "$DiaChiMayChu`t$TenMay"
    Set-Content -LiteralPath $hosts -Value $dong -Encoding ASCII
    & ipconfig.exe /flushdns | Out-Null
    Ghi-Ok "$DiaChiMayChu  $TenMay"
}

Ghi-Buoc 'Thử kết nối'
$kn = Test-NetConnection -ComputerName $TenMay -Port $Cong -WarningAction SilentlyContinue
if ($kn.TcpTestSucceeded) {
    Ghi-Ok "Kết nối TCP tới ${TenMay}:$Cong thành công"
    try { $r = Invoke-RestMethod -Uri "https://${TenMay}:$Cong/health" -TimeoutSec 10; Ghi-Ok "HTTPS hợp lệ, /health = $($r.trang_thai)" }
    catch { Ghi-Canh-Bao "TCP thông nhưng HTTPS lỗi: $($_.Exception.Message)" }
} else {
    Ghi-Canh-Bao "Chưa kết nối được ${TenMay}:$Cong. Kiểm tra IP máy chủ, dịch vụ HrmApi và tường lửa (IP máy này phải nằm trong danh sách được phép)."
}
