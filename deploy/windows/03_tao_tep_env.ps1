#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Sinh file server\.env từ .env.example với các bí mật ngẫu nhiên và quyền truy cập chặt.
#>
param(
    [string]$ThuMucMaNguon = 'C:\HRM\hrm',
    [string]$ThuMucChungChi = 'C:\HRM\chung_chi',
    [switch]$GhiDe
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri

$thuMucServer = Join-Path $ThuMucMaNguon 'server'
$mau = Join-Path $thuMucServer '.env.example'
$dich = Join-Path $thuMucServer '.env'
$tepMatKhauPfx = Join-Path $ThuMucChungChi '.pfx_mat_khau'
$tepPfx = Join-Path $ThuMucChungChi 'hrm_may_chu.pfx'

if (-not (Test-Path -LiteralPath $mau)) { Dung-Loi "Không thấy $mau (đã chép mã nguồn vào $ThuMucMaNguon chưa?)" }
if ((Test-Path -LiteralPath $dich) -and -not $GhiDe) { Dung-Loi "$dich đã tồn tại. Thêm -GhiDe nếu muốn tạo lại (mọi phiên đăng nhập sẽ bị vô hiệu và mật khẩu MongoDB của ứng dụng đổi)." }
if (-not (Test-Path -LiteralPath $tepMatKhauPfx)) { Dung-Loi "Không thấy $tepMatKhauPfx — chạy bước 02 trước." }

$giaTri = @{
    'TLS_PFX'          = $tepPfx
    'TLS_PFX_MAT_KHAU' = (Get-Content -LiteralPath $tepMatKhauPfx -Raw).Trim()
    'MONGO_MAT_KHAU'   = Tao-ChuoiNgauNhien 36
    'JWT_BI_MAT'       = Tao-ChuoiNgauNhien 64
}
$dong = Get-Content -LiteralPath $mau -Encoding UTF8 | ForEach-Object {
    $d = $_
    foreach ($khoa in $giaTri.Keys) { if ($d -match "^$khoa=") { $d = "$khoa=$($giaTri[$khoa])" } }
    $d
}
Ghi-TepUtf8 $dich (($dong -join "`r`n") + "`r`n")
# Quản trị + SYSTEM toàn quyền; dịch vụ API (chạy bằng LocalService) chỉ đọc.
Dat-QuyenTep $dich @('NT AUTHORITY\LOCAL SERVICE')
Remove-Item -LiteralPath $tepMatKhauPfx -Force
Ghi-Ok "Đã tạo $dich (quyền chặt) và xóa $tepMatKhauPfx"
Write-Host ''
Write-Host 'Mật khẩu user MongoDB của ứng dụng nằm trong .env (MONGO_MAT_KHAU); bước 04 sẽ tạo user đó.' -ForegroundColor Green
