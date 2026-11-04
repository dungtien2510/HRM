#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Kiểm tra máy chủ trước khi cài (không thay đổi gì).
#>
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri

Ghi-Buoc 'Hệ điều hành'
$hdh = Get-CimInstance Win32_OperatingSystem
Write-Host "  $($hdh.Caption) (build $($hdh.BuildNumber))"
if ([Environment]::OSVersion.Version.Major -lt 10) {
    Dung-Loi 'Cần Windows 10 trở lên (Windows 7/8 không chạy được Node.js LTS, MongoDB 8 và Electron hiện hành).'
}
Ghi-Ok 'Windows 10 trở lên'
if ($hdh.Caption -match 'Home') { Ghi-Canh-Bao 'Bản Home không có BitLocker. Nên dùng Windows 10/11 Pro để mã hóa ổ dữ liệu.' }

Ghi-Buoc 'Phần cứng'
$ram = [math]::Round($hdh.TotalVisibleMemorySize / 1MB, 1)
Write-Host "  RAM: $ram GB   CPU: $((Get-CimInstance Win32_Processor | Measure-Object NumberOfLogicalProcessors -Sum).Sum) luồng"
if ($ram -lt 3.5) { Ghi-Canh-Bao 'RAM dưới 4 GB: MongoDB sẽ rất chật.' }
elseif ($ram -lt 7.5) { Ghi-Canh-Bao 'RAM 4 GB chạy được nhưng sát; khuyến nghị 8 GB.' }
else { Ghi-Ok 'RAM đủ dùng' }
$oC = Get-PSDrive G
Write-Host ("  Ổ G: còn trống {0:N0} GB" -f ($oC.Free / 1GB))

Ghi-Buoc 'Node.js'
$node = Tim-Node
$phienBan = (& $node -v).Trim()
Write-Host "  $node  $phienBan"
if ([int]($phienBan.TrimStart('v').Split('.')[0]) -lt 22) { Dung-Loi 'Cần Node.js 22 trở lên (bản LTS).' }
Ghi-Ok 'Node.js đủ phiên bản'

Ghi-Buoc 'MongoDB và cổng'
$dvMongo = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if ($dvMongo) { Ghi-Canh-Bao "Đã có dịch vụ MongoDB (trạng thái $($dvMongo.Status)); script 01 sẽ chỉ chỉnh cấu hình." } else { Ghi-Ok 'Chưa có dịch vụ MongoDB' }
foreach ($cong in 27017, 8443) {
    $dangDung = Get-NetTCPConnection -LocalPort $cong -State Listen -ErrorAction SilentlyContinue
    if ($dangDung) { Ghi-Canh-Bao "Cổng $cong đang có tiến trình lắng nghe." } else { Ghi-Ok "Cổng $cong đang trống" }
}

Ghi-Buoc 'Công cụ ngoài (cho bước dịch vụ)'
$nssm = Get-Command nssm.exe -ErrorAction SilentlyContinue
if ($nssm) { Ghi-Ok "Có NSSM: $($nssm.Source)" } else { Ghi-Canh-Bao 'Chưa thấy nssm.exe trong PATH. Cần ở bước 05 (hoặc dùng -CachChay Tac_vu_hen_gio).' }
Write-Host ''
Write-Host 'Kiểm tra xong.' -ForegroundColor Green
