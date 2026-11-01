#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Tạo CA nội bộ (10 năm) và chứng chỉ máy chủ HTTPS cho 127.0.0.1 + hrm.tieudoantt.local (mặc định 2 năm).
.DESCRIPTION
  Kết quả trong -ThuMucXuat:
    hrm_goc.cer        chứng chỉ gốc (CÔNG KHAI) — phát cho các máy làm việc
    hrm_goc.pfx        khóa riêng của CA (BÍ MẬT, có mật khẩu) — cất ngoại tuyến, chỉ dùng khi cấp lại chứng chỉ
    hrm_may_chu.pfx    chứng chỉ + khóa của máy chủ, API đọc file này
    .pfx_mat_khau      mật khẩu của hrm_may_chu.pfx — script 03 đọc rồi xóa
  Chạy lại để cấp chứng chỉ máy chủ mới (khi đổi IP, hết hạn): script nhận ra hrm_goc.pfx và dùng lại CA cũ,
  nhờ đó các máy làm việc KHÔNG phải cài lại chứng chỉ gốc.
#>
param(
    [string]$TenMay,                   # mặc định lấy từ cau_hinh_trien_khai.psd1 (TenMayChu)
    [string[]]$DiaChiIpThem,           # mặc định: IpMayChu trong cau_hinh_trien_khai.psd1
    [string]$ThuMucXuat = 'C:\HRM\chung_chi',
    [int]$SoNamHieuLucMayChu = 2
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri
$cfg = Doc-CauHinhTrienKhai
if (-not $PSBoundParameters.ContainsKey('TenMay')) { $TenMay = $cfg.TenMayChu }
if (-not $PSBoundParameters.ContainsKey('DiaChiIpThem')) { $DiaChiIpThem = @($cfg.IpMayChu) }
if ($cfg.IpMayChuLaGiaTriMau -and -not $PSBoundParameters.ContainsKey('DiaChiIpThem')) {
    Ghi-Canh-Bao "IpMayChu đang là địa chỉ MẪU ($($cfg.IpMayChu)). Chứng chỉ vẫn dùng được cho 127.0.0.1 và $TenMay."
    Ghi-Canh-Bao 'Khi có IP thật: sửa cau_hinh_trien_khai.psd1 rồi chạy lại script này (máy làm việc không phải cài lại chứng chỉ gốc).'
}

foreach ($ip in $DiaChiIpThem) {
    $thu = $null
    if (-not [System.Net.IPAddress]::TryParse($ip, [ref]$thu)) { Dung-Loi "Địa chỉ IP không hợp lệ: $ip" }
}
New-Item -ItemType Directory -Force -Path $ThuMucXuat | Out-Null
# Chỉ Administrators/SYSTEM (kế thừa xuống file mới); script 05 sẽ cấp thêm quyền đọc file pfx cho dịch vụ API.
& icacls.exe $ThuMucXuat /inheritance:r /grant:r 'BUILTIN\Administrators:(OI)(CI)(F)' 'NT AUTHORITY\SYSTEM:(OI)(CI)(F)' | Out-Null

$tepCaCer = Join-Path $ThuMucXuat 'hrm_goc.cer'
$tepCaPfx = Join-Path $ThuMucXuat 'hrm_goc.pfx'
$tepMayChuPfx = Join-Path $ThuMucXuat 'hrm_may_chu.pfx'
$tepMatKhau = Join-Path $ThuMucXuat '.pfx_mat_khau'
$kho = 'Cert:\CurrentUser\My'
$daTao = @()

function Doc-MatKhau([string]$Nhan) {
    $a = Read-Host $Nhan -AsSecureString
    $b = Read-Host 'Nhập lại' -AsSecureString
    $pa = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($a))
    $pb = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($b))
    if ($pa -ne $pb) { Dung-Loi 'Hai lần nhập không khớp.' }
    if ($pa.Length -lt 12) { Dung-Loi 'Mật khẩu phải từ 12 ký tự.' }
    return $a
}

try {
    Ghi-Buoc 'Chứng chỉ gốc (CA)'
    if (Test-Path -LiteralPath $tepCaPfx) {
        Ghi-Ok 'Đã có hrm_goc.pfx — dùng lại CA cũ.'
        $mkCa = Read-Host 'Mật khẩu của hrm_goc.pfx' -AsSecureString
        $ca = Import-PfxCertificate -FilePath $tepCaPfx -CertStoreLocation $kho -Password $mkCa -Exportable
        $daTao += $ca
    } else {
        $mkCa = Doc-MatKhau 'Đặt mật khẩu bảo vệ khóa riêng của CA (từ 12 ký tự, cất kỹ)'
        $ca = $null
        # Cú pháp TextExtension cho CA khác nhau giữa các bản Windows → thử lần lượt rồi kiểm tra cờ CA.
        foreach ($ext in @('2.5.29.19={critical}{text}ca=true&pathlength=0', '2.5.29.19={critical}{text}ca=1&pathlength=0', $null)) {
            $thamSo = @{
                Type = 'Custom'; Subject = 'CN=HRM Noi Bo - CA goc, O=HRM'; KeyAlgorithm = 'RSA'; KeyLength = 3072
                HashAlgorithm = 'SHA256'; KeyExportPolicy = 'Exportable'; KeyUsage = @('CertSign', 'CRLSign', 'DigitalSignature')
                NotAfter = (Get-Date).AddYears(10); CertStoreLocation = $kho
            }
            if ($ext) { $thamSo['TextExtension'] = @($ext) }
            try { $thu = New-SelfSignedCertificate @thamSo } catch { continue }
            $daTao += $thu
            $bc = $thu.Extensions | Where-Object { $_.Oid.Value -eq '2.5.29.19' }
            if ($bc -and ([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]$bc).CertificateAuthority) { $ca = $thu; break }
            Remove-Item -LiteralPath "$kho\$($thu.Thumbprint)" -ErrorAction SilentlyContinue
        }
        if (-not $ca) { Dung-Loi 'Không tạo được chứng chỉ CA hợp lệ bằng New-SelfSignedCertificate. Dùng phương án OpenSSL trong docs/01_may_chu_windows.md (mục "Phương án B").' }
        Export-Certificate -Cert $ca -FilePath $tepCaCer -Type CERT | Out-Null
        Export-PfxCertificate -Cert $ca -FilePath $tepCaPfx -Password $mkCa | Out-Null
        Ghi-Ok 'Đã tạo CA mới (hạn 10 năm)'
    }
    if (-not (Test-Path -LiteralPath $tepCaCer)) { Export-Certificate -Cert $ca -FilePath $tepCaCer -Type CERT | Out-Null }

    Ghi-Buoc 'Chứng chỉ máy chủ'
    $dns = @($TenMay, 'localhost') | Select-Object -Unique
    $ips = @('127.0.0.1') + $DiaChiIpThem | Select-Object -Unique
    $san = '2.5.29.17={text}' + ((($dns | ForEach-Object { "DNS=$_" }) + ($ips | ForEach-Object { "IPAddress=$_" })) -join '&')
    $may = New-SelfSignedCertificate -Type Custom -Subject "CN=$TenMay" -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 `
        -KeyExportPolicy Exportable -KeyUsage DigitalSignature, KeyEncipherment -NotAfter (Get-Date).AddYears($SoNamHieuLucMayChu) `
        -CertStoreLocation $kho -Signer $ca -TextExtension @($san, '2.5.29.37={text}1.3.6.1.5.5.7.3.1')
    $daTao += $may
    $mkPfx = Tao-ChuoiNgauNhien 36
    Export-PfxCertificate -Cert $may -FilePath $tepMayChuPfx -Password (ConvertTo-SecureString -String $mkPfx -AsPlainText -Force) -ChainOption EndEntityCertOnly | Out-Null
    Ghi-TepUtf8 $tepMatKhau $mkPfx
    Dat-QuyenTep $tepMatKhau
    Ghi-Ok "Đã tạo hrm_may_chu.pfx (hạn đến $($may.NotAfter.ToString('dd/MM/yyyy')))"
    Write-Host "  Tên (SAN): $($dns -join ', ') | IP: $($ips -join ', ')"
} finally {
    # Không để khóa riêng nằm lại trong kho chứng chỉ của Windows.
    foreach ($c in $daTao) { Remove-Item -LiteralPath "$kho\$($c.Thumbprint)" -ErrorAction SilentlyContinue }
}

Ghi-Buoc 'Đối chiếu để phát cho máy làm việc'
Write-Host "  File chứng chỉ gốc : $tepCaCer"
Write-Host ("  SHA-256 của file   : " + (Get-FileHash -LiteralPath $tepCaCer -Algorithm SHA256).Hash)
Write-Host '  (Đọc giá trị SHA-256 này cho người cài đặt ở máy làm việc để họ đối chiếu trước khi tin cậy.)'
Write-Host ''
Write-Host 'Xong bước 02. Hãy sao lưu hrm_goc.pfx và mật khẩu của nó ra nơi AN TOÀN, ngoài máy chủ.' -ForegroundColor Green
