# Hàm dùng chung cho các script cài đặt (nạp bằng: . "$PSScriptRoot\chung.ps1").
# Tương thích Windows PowerShell 5.1 (mặc định của Windows 10). Lưu file ở dạng UTF-8 có BOM.
Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 mặc định có thể dùng TLS cũ; ép TLS 1.2 cho mọi cuộc gọi web.
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Ghi-Buoc([string]$NoiDung) { Write-Host ''; Write-Host "== $NoiDung ==" -ForegroundColor Cyan }
function Ghi-Ok([string]$NoiDung) { Write-Host "  [OK]  $NoiDung" -ForegroundColor Green }
function Ghi-Canh-Bao([string]$NoiDung) { Write-Host "  [!]   $NoiDung" -ForegroundColor Yellow }
function Dung-Loi([string]$NoiDung) { Write-Host "  [LOI] $NoiDung" -ForegroundColor Red; throw $NoiDung }

function Kiem-Tra-QuyenQuanTri {
    $dinhDanh = [Security.Principal.WindowsIdentity]::GetCurrent()
    $nguyenTac = New-Object Security.Principal.WindowsPrincipal($dinhDanh)
    if (-not $nguyenTac.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Dung-Loi 'Hãy mở PowerShell bằng "Run as administrator" rồi chạy lại.'
    }
}

# Chuỗi ngẫu nhiên an toàn (base64url, không có ký tự đặc biệt gây lỗi trong .env).
function Tao-ChuoiNgauNhien([int]$SoByte = 48) {
    $bo = New-Object byte[] $SoByte
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bo) } finally { $rng.Dispose() }
    return [Convert]::ToBase64String($bo).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

# Ghi file văn bản UTF-8 KHÔNG có BOM (MongoDB và Node đều không thích BOM trong file cấu hình).
function Ghi-TepUtf8([string]$DuongDan, [string]$NoiDung) {
    [System.IO.File]::WriteAllText($DuongDan, $NoiDung, (New-Object System.Text.UTF8Encoding($false)))
}

# Chỉ cho Administrators và SYSTEM toàn quyền; thêm quyền đọc cho các tài khoản khác nếu cần.
function Dat-QuyenTep([string]$DuongDan, [string[]]$DocDuoc = @()) {
    $lenh = @($DuongDan, '/inheritance:r', '/grant:r', 'BUILTIN\Administrators:(F)', 'NT AUTHORITY\SYSTEM:(F)')
    foreach ($tk in $DocDuoc) { $lenh += '/grant:r'; $lenh += "${tk}:(R)" }
    & icacls.exe @lenh | Out-Null
    if ($LASTEXITCODE -ne 0) { Dung-Loi "Không đặt được quyền truy cập cho $DuongDan" }
}

function Tim-Node {
    $n = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $n) { Dung-Loi 'Không thấy node.exe. Cài Node.js LTS (từ nodejs.org) rồi mở lại PowerShell.' }
    return $n.Source
}

# ---- Cấu hình triển khai (file cau_hinh_trien_khai.psd1 — chỉ chứa dữ liệu) ----
$script:DuongDanCauHinhTrienKhai = Join-Path $PSScriptRoot 'cau_hinh_trien_khai.psd1'
$script:IpMauChuaSua = '192.168.1.20'

function Doc-CauHinhTrienKhai {
    if (-not (Test-Path -LiteralPath $script:DuongDanCauHinhTrienKhai)) { Dung-Loi "Không thấy file cấu hình: $script:DuongDanCauHinhTrienKhai" }
    $c = Import-PowerShellDataFile -LiteralPath $script:DuongDanCauHinhTrienKhai
    foreach ($khoa in 'TenMayChu', 'IpMayChu', 'IpMayLamViec', 'CongApi', 'DuongDanNssm') {
        if (-not $c.ContainsKey($khoa)) { Dung-Loi "Thiếu khóa '$khoa' trong $script:DuongDanCauHinhTrienKhai" }
    }
    $thu = $null
    if (-not [System.Net.IPAddress]::TryParse([string]$c.IpMayChu, [ref]$thu)) { Dung-Loi "IpMayChu không hợp lệ: $($c.IpMayChu)" }
    $c.IpMayLamViec = @($c.IpMayLamViec)
    if ($c.IpMayLamViec.Count -eq 0) { Dung-Loi 'IpMayLamViec đang trống.' }
    $c.CongApi = [int]$c.CongApi
    $c['IpMayChuLaGiaTriMau'] = ([string]$c.IpMayChu -eq $script:IpMauChuaSua)
    return $c
}
