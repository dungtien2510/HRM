#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Cài API làm dịch vụ Windows "HrmApi" (tự chạy khi bật máy, tự khởi động lại khi lỗi, chạy bằng tài khoản LocalService).
.DESCRIPTION
  node.exe không tự là dịch vụ Windows, nên dùng NSSM (công cụ ngoài, không phải thư viện npm):
  tải nssm.exe từ https://nssm.cc , kiểm tra tính toàn vẹn theo trang tải rồi truyền đường dẫn vào -DuongDanNssm.
  Nếu không muốn dùng NSSM: -CachChay Tac_vu_hen_gio (Task Scheduler, chạy lúc khởi động, không phải dịch vụ đúng nghĩa).
  Chạy lại được: dịch vụ/tác vụ cũ sẽ được gỡ rồi tạo lại.
#>
param(
    [string]$ThuMucMaNguon = 'G:\Dung\lap_trinh\project\project_new\clau_AI\hrm',
    [string]$ThuMucNhatKy = 'G:\Dung\lap_trinh\project\project_new\clau_AI\nhat_ky_he_thong\api',
    [string]$ThuMucChungChi = 'G:\Dung\lap_trinh\project\project_new\clau_AI\chung_chi',
    [string]$DuongDanNssm = '',        # mặc định lấy từ cau_hinh_trien_khai.psd1 (DuongDanNssm)
    [ValidateSet('Dich_vu_NSSM', 'Tac_vu_hen_gio')][string]$CachChay = 'Dich_vu_NSSM',
    [string]$TenDichVu = 'HrmApi'
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri
$cfg = Doc-CauHinhTrienKhai
if (-not $DuongDanNssm) { $DuongDanNssm = [string]$cfg.DuongDanNssm }

$node = Tim-Node
$thuMucServer = Join-Path $ThuMucMaNguon 'server'
$tepVao = Join-Path $thuMucServer 'src\index.js'
$tepEnv = Join-Path $thuMucServer '.env'
$tepPfx = Join-Path $ThuMucChungChi 'hrm_may_chu.pfx'
foreach ($t in $tepVao, $tepEnv, $tepPfx) { if (-not (Test-Path -LiteralPath $t)) { Dung-Loi "Thiếu: $t (đã chạy các bước trước chưa?)" } }
if (-not (Get-Service -Name MongoDB -ErrorAction SilentlyContinue)) { Dung-Loi 'Chưa có dịch vụ MongoDB (bước 01).' }
New-Item -ItemType Directory -Force -Path $ThuMucNhatKy | Out-Null

Ghi-Buoc 'Quyền truy cập cho tài khoản chạy API (LocalService)'
$luu = 'NT AUTHORITY\LOCAL SERVICE'
& icacls.exe $ThuMucMaNguon /grant "${luu}:(OI)(CI)RX" /T /C | Out-Null
& icacls.exe $ThuMucNhatKy /grant "${luu}:(OI)(CI)M" /T /C | Out-Null
& icacls.exe $ThuMucChungChi /grant "${luu}:(R)" | Out-Null   # chỉ thư mục (để duyệt); file pfx cấp riêng bên dưới
& icacls.exe $tepPfx /grant "${luu}:(R)" | Out-Null
Ghi-Ok 'Đã cấp quyền đọc mã nguồn, .env, pfx và quyền ghi nhật ký'

if ($CachChay -eq 'Dich_vu_NSSM') {
    Ghi-Buoc 'Cài dịch vụ bằng NSSM'
    if (-not (Test-Path -LiteralPath $DuongDanNssm)) {
        $c = Get-Command nssm.exe -ErrorAction SilentlyContinue
        if ($c) { $DuongDanNssm = $c.Source }
    }
    if (-not (Test-Path -LiteralPath $DuongDanNssm)) {
        Dung-Loi "Không thấy nssm.exe tại '$DuongDanNssm'. Tải từ https://nssm.cc , giải nén win64\nssm.exe rồi sửa DuongDanNssm trong cau_hinh_trien_khai.psd1 (hoặc truyền -DuongDanNssm)."
    }
    if (Get-Service -Name $TenDichVu -ErrorAction SilentlyContinue) {
        Ghi-Canh-Bao "Dịch vụ $TenDichVu đã có — gỡ để tạo lại."
        & $DuongDanNssm stop $TenDichVu 2>&1 | Out-Null
        & $DuongDanNssm remove $TenDichVu confirm | Out-Null
    }
    & $DuongDanNssm install $TenDichVu $node 'src\index.js' | Out-Null
    if ($LASTEXITCODE -ne 0) { Dung-Loi 'nssm install thất bại.' }
    & $DuongDanNssm set $TenDichVu AppDirectory $thuMucServer | Out-Null
    & $DuongDanNssm set $TenDichVu DisplayName 'HRM API' | Out-Null
    & $DuongDanNssm set $TenDichVu Description 'API quản lý nhân sự (HTTPS). Phụ thuộc dịch vụ MongoDB.' | Out-Null
    & $DuongDanNssm set $TenDichVu Start SERVICE_AUTO_START | Out-Null
    & $DuongDanNssm set $TenDichVu DependOnService MongoDB | Out-Null
    & $DuongDanNssm set $TenDichVu ObjectName 'NT AUTHORITY\LocalService' | Out-Null
    & $DuongDanNssm set $TenDichVu AppEnvironmentExtra 'NODE_ENV=production' | Out-Null
    & $DuongDanNssm set $TenDichVu AppStdout (Join-Path $ThuMucNhatKy 'api.log') | Out-Null
    & $DuongDanNssm set $TenDichVu AppStderr (Join-Path $ThuMucNhatKy 'api.loi.log') | Out-Null
    & $DuongDanNssm set $TenDichVu AppRotateFiles 1 | Out-Null
    & $DuongDanNssm set $TenDichVu AppRotateOnline 1 | Out-Null
    & $DuongDanNssm set $TenDichVu AppRotateBytes 10485760 | Out-Null
    & $DuongDanNssm set $TenDichVu AppExit Default Restart | Out-Null
    & $DuongDanNssm set $TenDichVu AppRestartDelay 5000 | Out-Null
    & $DuongDanNssm set $TenDichVu AppStopMethodConsole 15000 | Out-Null
    Ghi-Ok "Đã cài dịch vụ $TenDichVu (tự chạy khi bật máy, phụ thuộc MongoDB)"
    Start-Service -Name $TenDichVu
    $trangThai = (Get-Service -Name $TenDichVu).Status
} else {
    Ghi-Buoc 'Cài tác vụ Task Scheduler (chạy lúc khởi động)'
    if (Get-ScheduledTask -TaskName $TenDichVu -ErrorAction SilentlyContinue) { Unregister-ScheduledTask -TaskName $TenDichVu -Confirm:$false }
    $hanhDong = New-ScheduledTaskAction -Execute $node -Argument 'src\index.js' -WorkingDirectory $thuMucServer
    $kichHoat = New-ScheduledTaskTrigger -AtStartup
    $nguoiChay = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\LOCAL SERVICE' -LogonType ServiceAccount -RunLevel Limited
    $caiDat = New-ScheduledTaskSettingsSet -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
    Register-ScheduledTask -TaskName $TenDichVu -Action $hanhDong -Trigger $kichHoat -Principal $nguoiChay -Settings $caiDat | Out-Null
    Start-ScheduledTask -TaskName $TenDichVu
    Ghi-Canh-Bao 'Chế độ Task Scheduler không tự ghi stdout ra file: xem lỗi bằng cách chạy tay "node src\index.js" trong thư mục server.'
    $trangThai = (Get-ScheduledTask -TaskName $TenDichVu).State
}

Start-Sleep -Seconds 5
Write-Host "  Trạng thái: $trangThai"
$logApi = Join-Path $ThuMucNhatKy 'api.log'
if (Test-Path -LiteralPath $logApi) { Write-Host '  --- 10 dòng log gần nhất ---'; Get-Content -LiteralPath $logApi -Tail 10 }
Write-Host ''
Write-Host 'Xong bước 05. Tiếp theo: bước 06 (tường lửa) rồi bước 07 (kiểm tra).' -ForegroundColor Green
