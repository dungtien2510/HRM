#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Cài MongoDB Community dạng dịch vụ Windows, chỉ lắng nghe 127.0.0.1, bật xác thực.
.DESCRIPTION
  Tải sẵn file .msi (MongoDB Community Server, Windows x64) từ mongodb.com rồi truyền đường dẫn vào -DuongDanMsi.
  Script: kiểm tra chữ ký số + in SHA-256 để bạn đối chiếu, cài dịch vụ "MongoDB" (tự chạy khi bật máy),
  ghi lại mongod.cfg với bindIp 127.0.0.1 + authorization enabled, khởi động lại và kiểm tra cổng 27017.
  Chạy lại được nhiều lần (nếu đã có dịch vụ thì chỉ chỉnh cấu hình).
#>
param(
    [Parameter(Mandatory = $true)][string]$DuongDanMsi,
    [string]$ThuMucDuLieu = 'C:\HRM\du_lieu\mongodb',
    [string]$ThuMucNhatKy = 'C:\HRM\nhat_ky_he_thong\mongodb',
    [int]$Cong = 27017
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri

Ghi-Buoc 'Chuẩn bị'
foreach ($d in $ThuMucDuLieu, $ThuMucNhatKy) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
Ghi-Ok "Thư mục dữ liệu: $ThuMucDuLieu ; nhật ký: $ThuMucNhatKy"

$dichVu = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if (-not $dichVu) {
    Ghi-Buoc 'Kiểm tra file cài đặt'
    if (-not (Test-Path -LiteralPath $DuongDanMsi)) { Dung-Loi "Không thấy file: $DuongDanMsi" }
    $chuKy = Get-AuthenticodeSignature -LiteralPath $DuongDanMsi
    Write-Host "  Chữ ký số: $($chuKy.Status) — $($chuKy.SignerCertificate.Subject)"
    if ($chuKy.Status -ne 'Valid' -or $chuKy.SignerCertificate.Subject -notmatch 'MongoDB') {
        Dung-Loi 'Chữ ký số của file .msi không hợp lệ hoặc không phải của MongoDB. Hãy tải lại từ mongodb.com.'
    }
    Write-Host ("  SHA-256: " + (Get-FileHash -LiteralPath $DuongDanMsi -Algorithm SHA256).Hash)
    Write-Host '  (Đối chiếu SHA-256 này với giá trị công bố trên trang tải của MongoDB nếu có.)'

    Ghi-Buoc 'Cài MongoDB (dịch vụ Windows)'
    $nhatKyMsi = Join-Path $ThuMucNhatKy 'cai_dat_msi.log'
    $thamSo = @(
        '/i', "`"$DuongDanMsi`"", '/qn', '/norestart', '/l*v', "`"$nhatKyMsi`"",
        'ADDLOCAL="ServerService"', 'SHOULD_INSTALL_COMPASS="0"',
        "MONGO_DATA_PATH=`"$ThuMucDuLieu\`"", "MONGO_LOG_PATH=`"$ThuMucNhatKy\`""
    )
    $kq = Start-Process -FilePath msiexec.exe -ArgumentList $thamSo -Wait -PassThru
    if ($kq.ExitCode -ne 0 -and $kq.ExitCode -ne 3010) { Dung-Loi "msiexec thất bại (mã $($kq.ExitCode)). Xem $nhatKyMsi" }
    Ghi-Ok 'Đã cài MongoDB'
    $dichVu = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
    if (-not $dichVu) { Dung-Loi 'Cài xong nhưng không thấy dịch vụ "MongoDB".' }
} else {
    Ghi-Ok 'Đã có dịch vụ MongoDB — bỏ qua bước cài, chỉ chỉnh cấu hình.'
}

Ghi-Buoc 'Cấu hình bảo mật (mongod.cfg)'
$wmi = Get-CimInstance Win32_Service -Filter "Name='MongoDB'"
if ($wmi.PathName -notmatch '--config\s+"?([^"]+?\.cfg)"?') { Dung-Loi "Không đọc được đường dẫn mongod.cfg từ: $($wmi.PathName)" }
$cfg = $Matches[1]
Write-Host "  File cấu hình: $cfg"
Copy-Item -LiteralPath $cfg -Destination "$cfg.$(Get-Date -Format yyyyMMdd_HHmmss).bak" -Force
$noiDung = @"
# Do deploy\windows\01_cai_mongodb.ps1 tạo. Chỉ lắng nghe 127.0.0.1, bắt buộc xác thực.
storage:
  dbPath: $ThuMucDuLieu
systemLog:
  destination: file
  logAppend: true
  path: $ThuMucNhatKy\mongod.log
net:
  port: $Cong
  bindIp: 127.0.0.1
security:
  authorization: enabled
"@
Ghi-TepUtf8 $cfg $noiDung
Ghi-Ok 'Đã ghi cấu hình: bindIp 127.0.0.1, authorization enabled'

Ghi-Buoc 'Dịch vụ tự chạy khi bật máy'
Set-Service -Name MongoDB -StartupType Automatic
& sc.exe failure MongoDB reset= 86400 actions= restart/60000/restart/60000/restart/120000 | Out-Null
Restart-Service -Name MongoDB -Force
Start-Sleep -Seconds 4
if ((Get-Service MongoDB).Status -ne 'Running') { Dung-Loi 'Dịch vụ MongoDB không chạy sau khi cấu hình. Xem mongod.log trong thư mục nhật ký.' }
Ghi-Ok 'MongoDB đang chạy, StartupType = Automatic, tự khởi động lại khi lỗi'

Ghi-Buoc 'Kiểm tra cổng'
$ds = @(Get-NetTCPConnection -LocalPort $Cong -State Listen -ErrorAction SilentlyContinue)
if ($ds.Count -eq 0) { Dung-Loi "Không thấy MongoDB lắng nghe cổng $Cong." }
$ngoai = @($ds | Where-Object { $_.LocalAddress -ne '127.0.0.1' })
if ($ngoai.Count -gt 0) { Dung-Loi "MongoDB đang lắng nghe ngoài 127.0.0.1: $(($ngoai | ForEach-Object LocalAddress) -join ', ')" }
Ghi-Ok "Cổng $Cong chỉ lắng nghe 127.0.0.1"
Write-Host ''
Write-Host 'Xong bước 01. Lưu ý: chưa có user nào — bước 04 sẽ tạo user quản trị và user ứng dụng.' -ForegroundColor Green
