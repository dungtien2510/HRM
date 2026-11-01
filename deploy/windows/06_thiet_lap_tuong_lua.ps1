#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Mở cổng API chỉ cho các máy làm việc được phép; chặn tường minh MongoDB từ mạng.
.DESCRIPTION
  Mặc định đọc danh sách IP từ cau_hinh_trien_khai.psd1 (IpMayLamViec). Sửa file đó rồi chạy lại, hoặc truyền tham số, ví dụ:
    .\06_thiet_lap_tuong_lua.ps1 -DiaChiChoPhep 192.168.1.21,192.168.1.22,192.168.1.30
  Có thể ghi dạng dải: 192.168.1.20-192.168.1.30 hoặc 192.168.1.0/24.
#>
param(
    [string[]]$DiaChiChoPhep,          # mặc định: IpMayLamViec trong cau_hinh_trien_khai.psd1
    [int]$Cong,                        # mặc định: CongApi trong cau_hinh_trien_khai.psd1
    [int]$CongMongo = 27017
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri
$cfg = Doc-CauHinhTrienKhai
if (-not $PSBoundParameters.ContainsKey('DiaChiChoPhep')) { $DiaChiChoPhep = @($cfg.IpMayLamViec) }
if (-not $PSBoundParameters.ContainsKey('Cong')) { $Cong = $cfg.CongApi }

Ghi-Buoc 'Kiểm tra danh sách địa chỉ'
if ($DiaChiChoPhep.Count -eq 0) { Dung-Loi 'Danh sách địa chỉ được phép đang trống.' }
foreach ($dc in $DiaChiChoPhep) {
    if ($dc -match '^(any|\*|0\.0\.0\.0(/0)?)$') { Dung-Loi "Không chấp nhận '$dc' (mở cho mọi địa chỉ)." }
    $thanhPhan = $dc -split '[-/]'
    $thu = $null
    if (-not [System.Net.IPAddress]::TryParse($thanhPhan[0], [ref]$thu)) { Dung-Loi "Địa chỉ không hợp lệ: $dc" }
}
Ghi-Ok ("Cho phép: " + ($DiaChiChoPhep -join ', '))

$tenCho = 'HRM API - chi cho may lam viec'
$tenChan = 'HRM - chan MongoDB tu mang'

Ghi-Buoc "Quy tắc cho phép cổng $Cong"
$cu = Get-NetFirewallRule -DisplayName $tenCho -ErrorAction SilentlyContinue
if ($cu) {
    Set-NetFirewallRule -DisplayName $tenCho -Enabled True -Action Allow -Direction Inbound -Profile Any | Out-Null
    $cu | Get-NetFirewallPortFilter | Set-NetFirewallPortFilter -Protocol TCP -LocalPort $Cong
    $cu | Get-NetFirewallAddressFilter | Set-NetFirewallAddressFilter -RemoteAddress $DiaChiChoPhep
    Ghi-Ok 'Đã cập nhật quy tắc cũ'
} else {
    New-NetFirewallRule -DisplayName $tenCho -Description 'Chỉ các máy làm việc HRM được kết nối tới API (HTTPS).' `
        -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Cong -RemoteAddress $DiaChiChoPhep -Profile Any | Out-Null
    Ghi-Ok 'Đã tạo quy tắc mới'
}

Ghi-Buoc "Chặn tường minh cổng MongoDB $CongMongo từ mọi địa chỉ khác loopback"
# Dải bỏ qua 127.0.0.0/8 để MongoDB vẫn nhận kết nối nội bộ từ API.
$ngoaiLoopback = @('0.0.0.0-126.255.255.255', '128.0.0.0-255.255.255.255')
if (Get-NetFirewallRule -DisplayName $tenChan -ErrorAction SilentlyContinue) { Remove-NetFirewallRule -DisplayName $tenChan }
New-NetFirewallRule -DisplayName $tenChan -Description 'MongoDB chỉ dùng nội bộ trên máy chủ.' -Direction Inbound -Action Block `
    -Protocol TCP -LocalPort $CongMongo -RemoteAddress $ngoaiLoopback -Profile Any | Out-Null
Ghi-Ok 'Đã tạo quy tắc chặn'

Ghi-Buoc 'Rà soát quy tắc cho phép nào khác đang mở cho node.exe'
$nghiNgo = @()
foreach ($r in (Get-NetFirewallRule -Direction Inbound -Enabled True -Action Allow -ErrorAction SilentlyContinue)) {
    $ud = ($r | Get-NetFirewallApplicationFilter -ErrorAction SilentlyContinue)
    if ($ud -and $ud.Program -like '*node.exe') { $nghiNgo += $r }
}
if ($nghiNgo.Count -gt 0) {
    Ghi-Canh-Bao 'Có quy tắc cho node.exe (thường do hộp thoại Windows hiện ra khi chạy thử tay "npm start"):'
    $nghiNgo | ForEach-Object { Write-Host "     - $($_.DisplayName)  [$($_.Name)]" }
    Write-Host '     Những quy tắc này có thể mở cổng cho mọi địa chỉ. Nên tắt/xóa bằng: Disable-NetFirewallRule -Name <Name>'
} else { Ghi-Ok 'Không có quy tắc node.exe nào khác' }

Write-Host ''
Write-Host 'Xong bước 06. Để đổi danh sách IP: chạy lại script này với -DiaChiChoPhep mới.' -ForegroundColor Green
