# Cấu trúc dữ liệu MongoDB (Bước 2)

Tài liệu này mô tả thiết kế, cách khởi tạo/nâng cấp và dữ liệu mẫu. **Bảng đầy đủ trường → mục quyền** nằm ở `docs/bang_truong_muc_quyen.md` (do mã sinh ra từ `shared/src/truong_du_lieu.js`, nguồn duy nhất).

> **Trạng thái kiểm chứng:** môi trường soạn thảo không có MongoDB. Logic tạo/nâng cấp được kiểm bằng CSDL giả có validator; JSON Schema được kiểm bằng bộ kiểm tra tự viết. **Hành vi trên MongoDB thật chỉ được kiểm bởi `server/test/mongo.tich_hop.test.js`** (mặc định bỏ qua, xem `docs/03_kiem_thu.md`). Hãy chạy nó một lần trên máy thử trước khi dùng.

## 1. Sáu collection

| Collection | Vai trò | Ghi chú |
|---|---|---|
| `nhan_su` | Một tài liệu cho mỗi người, nhúng các mảng `than_nhan`, `qua_trinh_truoc_tuyen_dung`, `qua_trinh_cong_tac`, `chien_dau`, `dao_tao`, `khen_thuong`, `luong`, `ky_luat`, `tien_an_tien_su`, `mang_xa_hoi` | Khoảng 11 KB mỗi hồ sơ mẫu; mảng có giới hạn số phần tử nên không thể phình tới 16 MB |
| `nghi_phep` | Collection riêng: `nhan_su_id`, `tu_ngay`, `den_ngay`, `loai_phep`, `so_ngay`, `ghi_chu` | Validator ép `den_ngay ≥ tu_ngay` |
| `nguoi_dung` | Tài khoản: `ten_dang_nhap` duy nhất, `mat_khau_bam` (chỉ nhận băm bcrypt), `loai`, `muc_duoc_xem[]`, `khoa`, `buoc_doi_mat_khau`, `so_lan_sai`, `so_phien_token` | Thay cho `tai_khoan` của Bước 1; chỉ một `admin` (chỉ mục từng phần) |
| `nhat_ky` | Nhật ký chỉ ghi thêm | User MongoDB của ứng dụng chỉ có `find` + `insert` |
| `cau_hinh` | Một tài liệu `_id: "he_thong"`: `ten_don_vi`, `schema_version`, `phien_ban_toi_thieu`, `cai_dat_sao_luu` | API đọc `phien_ban_toi_thieu` để trả 426 |
| `luot_dang_nhap` | Bộ đếm đăng nhập sai có TTL | **Collection thứ 6**, không chứa dữ liệu nhân sự; giữ từ Bước 1 vì cần cho giới hạn theo IP và theo tên không tồn tại. `nguoi_dung.so_lan_sai` chỉ là bộ đếm để hiển thị |

## 2. Quy ước trong `nhan_su`

- **Mỗi phần tử mảng có `id` (ObjectId)** để sửa/xóa đúng dòng. **Mỗi trường con có mục quyền riêng**: căn cước của thân nhân thuộc `so_can_cuoc`, tiền án của thân nhân thuộc `tien_an_tien_su`.
- **`than_nhan`**: `nhom` (`cua_ban_than` gồm cha, mẹ, anh chị em, vợ/chồng, con; `cua_vo_chong` gồm họ hàng bên vợ/chồng), `quan_he`, `ngay_sinh`…
- **Ngày không đủ**: `{nam, thang?, ngay?, ngay_chuan_hoa, do_chinh_xac}`. `ngay_chuan_hoa` là **ngày đầu của kỳ** lúc 00:00 UTC (chỉ có tháng/năm → ngày 1; chỉ có năm → 01/01). `thang` tùy chọn (chốt ở Q9). Validator ép `do_chinh_xac` khớp thành phần có mặt. Hàm: `chuan_hoa_ngay_kdd`, `tu_chuoi_ngay("07/1/1968" | "11/2024" | "2016")`, `ngay_cuoi_ky`, `tuoi_tai`, `moc_sinh_cho_duoi_tuoi`, `la_duoi_tuoi`, `con_hieu_luc`.
- **"Đến nay"** lưu bằng `den: null` + `dang_dien_ra: true`.
- **Kỷ luật** có `het_hieu_luc` (ngày không đủ, có thể `null` = chưa ghi ngày hết → coi là còn hiệu lực).
- **Chưa khai** = `null`/vắng mặt; **đã khai là không** = chuỗi `Không`. Chuỗi rỗng không bao giờ được lưu.
- **`tim_kiem`** (nội bộ, không trả ra API) = tên khai sinh + tên gọi khác + mã + số hiệu, bỏ dấu, `đ→d`, viết thường, gọn khoảng trắng. Mỗi thân nhân có `tim_kiem` riêng (tìm theo tên thân nhân cần quyền `than_nhan`). Căn cước/điện thoại **không** nằm trong `tim_kiem` vì thuộc mục khác.
- **`version`** (số nguyên ≥ 1, tăng mỗi lần sửa) và `updated_at` dùng cho kiểm soát ghi đồng thời ở các bước sau.
- Tên trường theo yêu cầu Bước 2: `bo_phan` (Bước 0 gọi `phong_ban`), `chuc_vu` (`chuc_vu_hien_tai`), `nhom` (`ben`), `luong` (mảng, trước là `qua_trinh_luong`), `created_at`/`updated_at` (trước là `tao_luc`/`sua_luc`).

## 3. Mục quyền và projection

```js
const { tao_projection, kiem_tra_truong_truy_van } = require('@hrm/shared');

const proj = tao_projection(['thong_tin_co_ban', 'than_nhan']);   // danh sách TRẮNG các đường dẫn
db.collection('nhan_su').find({ bo_phan: 'Kho vận' }, { projection: proj });

kiem_tra_truong_truy_van('nhan_su', muc_duoc_xem, 'luong.he_so_luong'); // lọc/sắp xếp/tìm kiếm/xuất cũng phải qua đây
// → { ok: false, ly_do: 'khong_co_quyen_muc', muc: 'luong' }
```

Trường chưa khai báo **không bao giờ** được trả ra; `tim_kiem` bị loại; có `than_nhan` mà không có `so_can_cuoc` thì từng thân nhân không có căn cước và tiền án. Đường dẫn lá (vd `than_nhan.ngay_sinh.ngay_chuan_hoa`) được tra mục; đường dẫn là mảng nguyên (`than_nhan`) bị từ chối, phải dùng đường dẫn lá.

## 4. Chỉ mục

| Collection | Chỉ mục | Mục đích |
|---|---|---|
| `nhan_su` | `ma_nhan_vien` (duy nhất) · `bo_phan` · `tim_kiem` · `than_nhan.ngay_sinh.ngay_chuan_hoa` · `khen_thuong.thoi_diem.ngay_chuan_hoa` | tra cứu mã, lọc bộ phận, tìm theo tên, "có con dưới N tuổi", khen thưởng theo kỳ |
| `nghi_phep` | `(nhan_su_id, tu_ngay, den_ngay)` | nghỉ phép của một người theo thời gian |
| `nguoi_dung` | `ten_dang_nhap` (duy nhất) · `loai` (duy nhất từng phần, chỉ với `admin`) | đăng nhập; đúng một admin |
| `nhat_ky` | `thoi_diem` giảm dần · `(tai_khoan.id, thoi_diem)` | xem nhật ký |
| `luot_dang_nhap` | `(khoa, luc)` · `het_han` (TTL 0 giây) | giới hạn đăng nhập sai, tự dọn |

Chỉ mục lệch định nghĩa (hoặc cùng khóa khác tên) được xóa và tạo lại khi chạy bộ khởi tạo.

## 5. Validator

JSON Schema **sinh tự động** từ bảng khai báo (`server/src/csdl/schema/`), chế độ `validationLevel: strict`, `validationAction: error`; `additionalProperties: false` ở mọi cấp nên trường gõ sai bị từ chối thay vì lưu lặng lẽ. Chỉ dùng từ khóa MongoDB hỗ trợ (không `$ref`, `format`, `default`, `integer`). Validator chỉ kiểm khi **ghi**: dữ liệu có sẵn trước khi gắn validator không bị xóa, bộ nâng cấp báo số tài liệu không đạt.

## 6. Quyền của user MongoDB ứng dụng (`vai_tro_hrm_ung_dung`, đúng một CSDL)

| Collection | Hành động |
|---|---|
| `nhan_su`, `nghi_phep`, `nguoi_dung` | `find`, `insert`, `update`, `remove` |
| `cau_hinh` | `find`, `insert`, `update` (không xóa) |
| `luot_dang_nhap` | `find`, `insert`, `remove` |
| `nhat_ky` | **`find`, `insert`** (không sửa, không xóa) |

User ứng dụng **không có** `createCollection`, `createIndex`, `collMod`, `drop*`: nó không gỡ được validator và không tạo/xóa chỉ mục. Mình giữ `find` trên `nhat_ky` vì admin cần xem nhật ký qua API; muốn chặt hơn nữa có thể tách một user chỉ đọc nhật ký ở bước sau.

## 7. Khởi tạo và nâng cấp

```powershell
cd C:\HRM\hrm
npm run khoi_tao_csdl --workspace server                 # tạo hoặc ép cấu trúc về đúng phiên bản (hỏi mật khẩu user quản trị MongoDB)
npm run nang_cap_csdl --workspace server -- --chi-kiem-tra   # chỉ kiểm tra và in kế hoạch, không đổi gì
npm run nang_cap_csdl --workspace server -- --yes            # không hỏi xác nhận
```
(`khoi_tao_csdl` và `nang_cap_csdl` là cùng một bộ chạy: khởi tạo = nâng cấp từ trạng thái rỗng.)

**Phát hiện phiên bản:** `cau_hinh.he_thong.schema_version` nếu có; chưa có nhưng đã có collection của Bước 1 → phiên bản 1; trống → 0. Phiên bản đích hiện hành là **2**.

**Kiểm tra trước khi chạy** (không đổi gì): MongoDB ≥ 6.0; user có đủ quyền trên CSDL (`createCollection`, `collMod`, `createIndex`, `dropIndex`, `find`, `insert`, `update`, `remove`, `renameCollectionSameDB`; thiếu thì script đề nghị cấp `dbOwner`); dữ liệu Bước 1 chuyển được không (tên đăng nhập, băm bcrypt, loại tài khoản, trùng tên, hơn một admin → **chặn, không đụng dữ liệu**); số tài liệu hiện có không đạt validator mới (chỉ cảnh báo).

**Bước → phiên bản 2:** (1) tạo `nguoi_dung` → (2) chép `tai_khoan` sang (giữ nguyên `_id` nên token và nhật ký cũ vẫn khớp) → (3) đổi tên `tai_khoan` thành `tai_khoan_v1_sao_luu` → (4) chuyển `cau_hinh` (giữ `phien_ban_toi_thieu` đang dùng) → (5) ép validator + chỉ mục cả 6 collection → (6) cập nhật vai trò ứng dụng → (7) ghi `schema_version = 2` **sau cùng**. Mọi thao tác chạy lại được; bị ngắt giữa chừng thì chạy lại lệnh là tiếp tục. **Dữ liệu cũ không bị xóa.** Khôi phục thủ công (nếu cần quay lại mã Bước 1): đổi tên `tai_khoan_v1_sao_luu` về `tai_khoan` và đặt lại `schema_version` về 1.

**API khởi động** sẽ từ chối chạy nếu `schema_version` khác phiên bản mã nguồn (nói rõ phải chạy `npm run nang_cap_csdl`), nên không thể chạy API trên cấu trúc sai.

**Thêm trường/bước mới:** thêm một dòng vào `shared/src/truong_du_lieu.js` → chạy `npm run bang_truong --workspace shared` (tạo lại tài liệu) → `npm run nang_cap_csdl` (validator tự cập nhật). Chỉ khi cần **chuyển đổi dữ liệu** mới thêm phần tử vào `CAC_BUOC` (`server/src/csdl/nang_cap/chay.js`) và tăng `PHIEN_BAN_SCHEMA`. Không có khóa chống hai người chạy nâng cấp cùng lúc: hãy chạy trên một máy.

## 8. Dữ liệu mẫu (giả)

```powershell
npm run nap_du_lieu_mau --workspace server                                  # hỏi xác nhận (gõ "mau"), nạp 200 hồ sơ
npm run nap_du_lieu_mau --workspace server -- --yes --so-luong=500 --hat-giong=7
npm run nap_du_lieu_mau --workspace server -- --kem-tai-khoan-mau            # thêm 2 tài khoản thử (xem_day_du, xem_mot_so_muc), mật khẩu ngẫu nhiên in một lần
npm run nap_du_lieu_mau --workspace server -- --xoa                          # chỉ xóa dữ liệu mẫu
```
Dùng user ứng dụng trong `.env`. Chạy lại luôn **xóa dữ liệu mẫu cũ rồi nạp lại** và chỉ đụng tài liệu có `la_mau: true`, **không bao giờ đụng hồ sơ thật**. Mặc định 200 hồ sơ + khoảng 370 bản ghi nghỉ phép, cùng seed và ngày tham chiếu cho cùng dữ liệu. Bảo đảm có:

- 40 hồ sơ có con dưới 6 tuổi, gồm cả ca sát ranh giới (hồ sơ `MAU0011` có con **đúng** 6 tuổi nên không tính, `MAU0016` có con sinh sau mốc 1 ngày nên tính), con chỉ ghi năm/tháng sinh;
- 15 kỷ luật còn hiệu lực (kể cả chưa ghi ngày hết) và 16 đã hết hiệu lực; 4 hồ sơ có tiền sự (giả);
- hơn 3.000 ngày chỉ có tháng/năm và hơn 380 ngày chỉ có năm.

**Cách bảo đảm không là dữ liệu thật:** mã `MAU0001…`; căn cước bắt đầu `000` (mã tỉnh 000 không tồn tại); điện thoại bắt đầu `0000`; số BHXH/BHYT có tiền tố `MAU`; tên trường/cơ sở đào tạo có hậu tố "(mẫu)"; mọi hồ sơ có `la_mau: true`. Tên người ghép ngẫu nhiên từ danh sách họ/đệm/tên phổ biến nên có thể trùng tên người thật — không đại diện cho ai.

## 9. Chỗ khác với Bước 0/1

| Điểm | Bước 0/1 | Bước 2 | Lý do |
|---|---|---|---|
| Bản ghi con | Collection riêng (giả định) | Nhúng mảng, thêm `tien_an_tien_su`, `qua_trinh_truoc_tuyen_dung`, `chien_dau` | Yêu cầu Bước 2; `tien_an_tien_su` vẫn là một mục quyền riêng nên cần chỗ ở |
| Tài khoản | `tai_khoan` (`trang_thai`, `cac_muc_duoc_xem`) | `nguoi_dung` (`khoa`, `muc_duoc_xem`, `buoc_doi_mat_khau`, `so_lan_sai`) | Yêu cầu Bước 2; nâng cấp tự chuyển dữ liệu |
| Tạo chỉ mục/collection | API tự tạo khi khởi động | Script nâng cấp (user quản trị) | User ứng dụng không còn quyền cấu trúc |
| Thời gian tạo/sửa | `tao_luc`/`sua_luc` | `created_at`/`updated_at` | Thống nhất với `updated_at` yêu cầu |
| Đăng nhập | — | `buoc_doi_mat_khau` được trả trong hồ sơ tài khoản | Giao diện cần buộc đổi mật khẩu (chưa làm ở Bước 2) |
