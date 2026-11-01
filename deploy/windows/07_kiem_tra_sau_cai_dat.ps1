#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Kiểm tra sau cài đặt trên máy chủ (không thay đổi gì).
#>
param(
    [string]$Url,                      # mặc định: https://127.0.0.1:<CongApi>/health
    [string]$TenDichVu = 'HrmApi',
    [int]$Cong,                        # mặc định: CongApi trong cau_hinh_trien_khai.psd1
    [int]$CongMongo = 27017
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri
$cfg = Doc-CauHinhTrienKhai
if (-not $PSBoundParameters.ContainsKey('Cong')) { $Cong = $cfg.CongApi }
if (-not $PSBoundParameters.ContainsKey('Url')) { $Url = "https://127.0.0.1:$Cong/health" }
$loi = 0
function Kiem([bool]$Dat, [string]$ThongDiep) { if ($Dat) { Ghi-Ok $ThongDiep } else { Ghi-Canh-Bao "KHÔNG ĐẠT: $ThongDiep"; $script:loi++ } }

Ghi-Buoc 'Dịch vụ'
foreach ($ten in 'MongoDB', $TenDichVu) {
    $dv = Get-Service -Name $ten -ErrorAction SilentlyContinue
    if ($dv) { Kiem ($dv.Status -eq 'Running') "$ten đang chạy"; Kiem ($dv.StartType -eq 'Automatic') "$ten tự chạy khi bật máy" }
    else {
        $tac = Get-ScheduledTask -TaskName $ten -ErrorAction SilentlyContinue
        if ($tac -and $ten -eq $TenDichVu) { Kiem ($tac.State -eq 'Running') "$ten (tác vụ hẹn giờ) đang chạy" } else { Kiem $false "Có dịch vụ $ten" }
    }
}

Ghi-Buoc 'Cổng lắng nghe'
$mongo = @(Get-NetTCPConnection -LocalPort $CongMongo -State Listen -ErrorAction SilentlyContinue)
Kiem ($mongo.Count -gt 0 -and @($mongo | Where-Object { $_.LocalAddress -ne '127.0.0.1' }).Count -eq 0) "MongoDB ($CongMongo) chỉ lắng nghe 127.0.0.1"
$api = @(Get-NetTCPConnection -LocalPort $Cong -State Listen -ErrorAction SilentlyContinue)
Kiem ($api.Count -gt 0) "API lắng nghe cổng $Cong"
if ($api.Count -gt 0) {
    $tienTrinhApi = $api[0].OwningProcess
    $http = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -eq $tienTrinhApi -and $_.LocalPort -ne $Cong })
    Kiem ($http.Count -eq 0) 'Tiến trình API chỉ mở đúng một cổng HTTPS (không có cổng HTTP nào khác)'
}

Ghi-Buoc 'Tường lửa'
$qt = Get-NetFirewallRule -DisplayName 'HRM API - chi cho may lam viec' -ErrorAction SilentlyContinue
Kiem ([bool]$qt) 'Có quy tắc cho phép API'
if ($qt) {
    $dc = ($qt | Get-NetFirewallAddressFilter).RemoteAddress
    Write-Host "  Địa chỉ được phép: $($dc -join ', ')"
    Kiem (($dc -notcontains 'Any') -and ($dc -notcontains '*')) 'Quy tắc không mở cho mọi địa chỉ'
}
Kiem ([bool](Get-NetFirewallRule -DisplayName 'HRM - chan MongoDB tu mang' -ErrorAction SilentlyContinue)) 'Có quy tắc chặn MongoDB từ mạng'

Ghi-Buoc "Gọi thử $Url"
try {
    $kq = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10
    Kiem ($kq.trang_thai -eq 'ok') "/health trả về trang_thai = $($kq.trang_thai) (chứng chỉ đã được máy này tin cậy, API nối được MongoDB)"
} catch {
    Kiem $false "Không gọi được $Url : $($_.Exception.Message)"
    Write-Host '  Nếu lỗi là về chứng chỉ: chạy may_lam_viec_cai_chung_chi.ps1 ngay trên máy chủ để tin cậy hrm_goc.cer.'
}
Write-Host ''
if ($loi -eq 0) { Write-Host 'TẤT CẢ ĐẠT.' -ForegroundColor Green } else { Write-Host "$loi mục chưa đạt — xem docs/01_may_chu_windows.md (mục xử lý sự cố)." -ForegroundColor Yellow }
