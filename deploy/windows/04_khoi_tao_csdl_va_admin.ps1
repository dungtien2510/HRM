#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Cài thư viện cho server, tạo user MongoDB (quyền tối thiểu trên đúng một CSDL), tạo cấu trúc CSDL (collection, validator, chỉ mục) và tài khoản admin của ứng dụng.
.DESCRIPTION
  Cần: đã có server\.env (bước 03). Hai lệnh sau hỏi mật khẩu trực tiếp trên màn hình (không hiện ký tự).
  Nếu máy chủ không có Internet: chạy "npm install" ở máy có mạng (cùng phiên bản Node, cùng Windows x64),
  chép cả thư mục node_modules sang rồi dùng -BoQuaCaiThuVien.
#>
param(
    [string]$ThuMucMaNguon = 'G:\Dung\lap_trinh\project\project_new\clau_AI\hrm',
    [switch]$BoQuaCaiThuVien
)
. "$PSScriptRoot\chung.ps1"
Kiem-Tra-QuyenQuanTri
$null = Tim-Node
Push-Location $ThuMucMaNguon
try {
    if (-not (Test-Path -LiteralPath 'server\.env')) { Dung-Loi 'Chưa có server\.env — chạy bước 03 trước.' }
    if (-not $BoQuaCaiThuVien) {
        Ghi-Buoc 'Cài thư viện (chỉ server và shared, không cài Electron)'
        # & npm.cmd install --omit=dev --workspace server --workspace shared
        & npm.cmd ci --omit=dev --workspace server --workspace shared
        if ($LASTEXITCODE -ne 0) { Dung-Loi 'npm install thất bại (bcrypt cần tải bản dựng sẵn từ GitHub hoặc có công cụ biên dịch).' }
    }
    Ghi-Buoc 'Tạo user MongoDB (quản trị + ứng dụng) và vai trò quyền tối thiểu'
    & npm.cmd run khoi_tao_mongo --workspace server
    if ($LASTEXITCODE -ne 0) { Dung-Loi 'khoi_tao_mongo thất bại.' }
    Ghi-Buoc 'Tạo cấu trúc CSDL: 6 collection, JSON Schema validator, chỉ mục, cấu hình hệ thống (chạy lại được)'
    & npm.cmd run khoi_tao_csdl --workspace server
    if ($LASTEXITCODE -ne 0) { Dung-Loi 'khoi_tao_csdl thất bại (xem thông báo ở trên; chạy lại được).' }
    Ghi-Buoc 'Tạo tài khoản admin của ứng dụng'
    & npm.cmd run tao_admin --workspace server
    if ($LASTEXITCODE -ne 0) { Dung-Loi 'tao_admin thất bại.' }
} finally { Pop-Location }
Write-Host ''
Write-Host 'Xong bước 04. Hãy cất mật khẩu user quản trị MongoDB và mật khẩu admin ứng dụng vào nơi an toàn.' -ForegroundColor Green
