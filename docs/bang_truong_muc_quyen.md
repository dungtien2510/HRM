# Bảng trường dữ liệu → mục quyền

> **File này do `shared/scripts/tao_bang_truong.js` sinh từ `shared/src/truong_du_lieu.js` (nguồn duy nhất). Không sửa tay.** Chạy lại: `npm run bang_truong --workspace shared`.

- **Mục** là một trong 11 mục quyền hoặc "kỹ thuật" (trường hệ thống, ai đọc được hồ sơ cũng thấy). `●` = mục nhạy cảm (`nghi_phep`, `luong`, `ky_luat`, `tien_an_tien_su`, `so_can_cuoc`).
- **Bắt buộc**: *CSDL* = validator của MongoDB từ chối nếu thiếu; *biểu mẫu* = bắt buộc theo SYLL, kiểm ở API/giao diện (dùng để đếm "thiếu trường").
- Trường kiểu mảng (`than_nhan[]`…) là tài liệu nhúng; mỗi phần tử có `id`, và **mỗi trường con có mục quyền riêng** (vd căn cước của thân nhân thuộc `so_can_cuoc`, tiền án của thân nhân thuộc `tien_an_tien_su`).
- Trường chữ chưa khai = `null`/vắng mặt; đã khai là không = chuỗi `Không`. Ngày không đủ = `{nam, thang?, ngay?, ngay_chuan_hoa, do_chinh_xac}`.

## Collection `nhan_su`

| Đường dẫn | Kiểu | Mục | NC | Bắt buộc | Ghi chú |
|---|---|---|---|---|---|
| `_id` | ObjectId | kỹ thuật |  | CSDL |  |
| `version` | số nguyên | kỹ thuật |  | CSDL |  |
| `created_at` | ngày | kỹ thuật |  | CSDL |  |
| `updated_at` | ngày | kỹ thuật |  | CSDL |  |
| `la_mau` | đúng/sai | kỹ thuật |  |  |  |
| `da_xoa` | đúng/sai | kỹ thuật |  |  |  |
| `xoa_luc` | ngày | kỹ thuật |  |  |  |
| `ma_nhan_vien` | chuỗi (≤ 20) | `thong_tin_co_ban` |  | CSDL | mẫu `^[A-Za-z0-9_-]{3,20}$` |
| `so_hieu` | chuỗi (≤ 30) | `thong_tin_co_ban` |  |  |  |
| `ho_ten_khai_sinh` | chuỗi (≤ 120) | `thong_tin_co_ban` |  | CSDL |  |
| `ten_goi_khac` | chuỗi (≤ 120) | `thong_tin_co_ban` |  |  | có thể là "Không" |
| `ngay_sinh` | ngày không đủ | `thong_tin_co_ban` |  | CSDL |  |
| `gioi_tinh` | một trong: `nam`, `nu` | `thong_tin_co_ban` |  | CSDL |  |
| `noi_dang_ky_khai_sinh` | địa chỉ | `thong_tin_co_ban` |  | biểu mẫu |  |
| `noi_dang_ky_khai_sinh_sau_sap_nhap` | địa chỉ | `thong_tin_co_ban` |  |  |  |
| `que_quan` | địa chỉ | `thong_tin_co_ban` |  | biểu mẫu |  |
| `que_quan_sau_sap_nhap` | địa chỉ | `thong_tin_co_ban` |  |  |  |
| `dan_toc` | chuỗi (≤ 50) | `thong_tin_co_ban` |  | biểu mẫu |  |
| `ton_giao` | chuỗi (≤ 50) | `thong_tin_co_ban` |  |  | có thể là "Không" |
| `chuc_vu` | chuỗi (≤ 150) | `thong_tin_co_ban` |  |  |  |
| `bo_phan` | chuỗi (≤ 150) | `thong_tin_co_ban` |  | CSDL |  |
| `trang_thai_nhan_su` | một trong: `dang_lam_viec`, `tam_nghi`, `nghi_viec`, `nghi_huu` | `thong_tin_co_ban` |  | CSDL |  |
| `anh_4x6_id` | ObjectId | `thong_tin_co_ban` |  |  |  |
| `tim_kiem` | chuỗi (≤ 700) | `thong_tin_co_ban` |  | CSDL | nội bộ, không trả ra |
| `noi_thuong_tru` | địa chỉ | `lien_he` |  | biểu mẫu |  |
| `noi_o_hien_nay` | địa chỉ | `lien_he` |  | biểu mẫu |  |
| `so_dien_thoai` | chuỗi (≤ 11) | `lien_he` |  |  | mẫu `^[0-9]{9,11}$` |
| `mang_xa_hoi[]` | mảng (≤ 10 phần tử) | `lien_he` |  |  |  |
| `mang_xa_hoi[].id` | ObjectId | `lien_he` |  | CSDL |  |
| `mang_xa_hoi[].nen_tang` | chuỗi (≤ 30) | `lien_he` |  |  |  |
| `mang_xa_hoi[].tai_khoan` | chuỗi (≤ 100) | `lien_he` |  |  |  |
| `mang_xa_hoi[].so_dien_thoai` | chuỗi (≤ 11) | `lien_he` |  |  | mẫu `^[0-9]{9,11}$` |
| `so_can_cuoc` | chuỗi (≤ 12) | `so_can_cuoc` | ● | biểu mẫu | mẫu `^[0-9]{9,12}$` |
| `ngay_cap_can_cuoc` | ngày | `so_can_cuoc` | ● |  |  |
| `noi_cap_can_cuoc` | chuỗi (≤ 150) | `so_can_cuoc` | ● |  |  |
| `cap_uy_hien_tai` | chuỗi (≤ 100) | `qua_trinh_cong_tac` |  |  | có thể là "Không" |
| `cap_uy_kiem_nhiem` | chuỗi (≤ 100) | `qua_trinh_cong_tac` |  |  | có thể là "Không" |
| `ngay_bo_nhiem` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `ngay_bo_nhiem_lai` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `chuc_vu_kiem_nhiem` | chuỗi (≤ 150) | `qua_trinh_cong_tac` |  |  | có thể là "Không" |
| `nghe_nghiep_truoc_tuyen_dung` | chuỗi (≤ 150) | `qua_trinh_cong_tac` |  |  |  |
| `ngay_tuyen_dung_lan_dau` | ngày không đủ | `qua_trinh_cong_tac` |  | biểu mẫu |  |
| `co_quan_tuyen_dung_lan_dau` | chuỗi (≤ 200) | `qua_trinh_cong_tac` |  |  |  |
| `ngay_tuyen_dung_lan_sau` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `co_quan_tuyen_dung_lan_sau` | chuỗi (≤ 200) | `qua_trinh_cong_tac` |  |  |  |
| `ngay_vao_co_quan_hien_nay` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `ngay_vao_dang` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `ngay_vao_dang_chinh_thuc` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `ngay_nhap_ngu` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `ngay_xuat_ngu` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `ngay_tai_ngu` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `quan_ham_chuc_vu_cao_nhat` | chuỗi (≤ 200) | `qua_trinh_cong_tac` |  |  |  |
| `ngach_chuc_danh` | chuỗi (≤ 150) | `qua_trinh_cong_tac` |  |  |  |
| `so_truong_cong_tac` | chuỗi (≤ 300) | `qua_trinh_cong_tac` |  |  |  |
| `cong_viec_lam_lau_nhat` | chuỗi (≤ 300) | `qua_trinh_cong_tac` |  |  |  |
| `qua_trinh_truoc_tuyen_dung[]` | mảng (≤ 60 phần tử) | `qua_trinh_cong_tac` |  |  |  |
| `qua_trinh_truoc_tuyen_dung[].id` | ObjectId | `qua_trinh_cong_tac` |  | CSDL |  |
| `qua_trinh_truoc_tuyen_dung[].tu` | ngày không đủ | `qua_trinh_cong_tac` |  | CSDL |  |
| `qua_trinh_truoc_tuyen_dung[].den` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `qua_trinh_truoc_tuyen_dung[].noi_dung` | chuỗi (≤ 500) | `qua_trinh_cong_tac` |  | CSDL |  |
| `qua_trinh_cong_tac[]` | mảng (≤ 60 phần tử) | `qua_trinh_cong_tac` |  |  |  |
| `qua_trinh_cong_tac[].id` | ObjectId | `qua_trinh_cong_tac` |  | CSDL |  |
| `qua_trinh_cong_tac[].tu` | ngày không đủ | `qua_trinh_cong_tac` |  | CSDL |  |
| `qua_trinh_cong_tac[].den` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `qua_trinh_cong_tac[].dang_dien_ra` | đúng/sai | `qua_trinh_cong_tac` |  |  |  |
| `qua_trinh_cong_tac[].noi_dung` | chuỗi (≤ 600) | `qua_trinh_cong_tac` |  | CSDL |  |
| `qua_trinh_cong_tac[].chuc_danh` | chuỗi (≤ 200) | `qua_trinh_cong_tac` |  |  |  |
| `qua_trinh_cong_tac[].don_vi_cong_tac` | chuỗi (≤ 300) | `qua_trinh_cong_tac` |  |  |  |
| `chien_dau[]` | mảng (≤ 60 phần tử) | `qua_trinh_cong_tac` |  |  |  |
| `chien_dau[].id` | ObjectId | `qua_trinh_cong_tac` |  | CSDL |  |
| `chien_dau[].tu` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `chien_dau[].den` | ngày không đủ | `qua_trinh_cong_tac` |  |  |  |
| `chien_dau[].ten_chien_dich_tran_danh` | chuỗi (≤ 300) | `qua_trinh_cong_tac` |  |  |  |
| `chien_dau[].chien_truong_dia_diem` | chuỗi (≤ 300) | `qua_trinh_cong_tac` |  |  |  |
| `chien_dau[].chuc_vu_don_vi` | chuỗi (≤ 300) | `qua_trinh_cong_tac` |  |  |  |
| `chien_dau[].hinh_thuc_tac_chien` | chuỗi (≤ 300) | `qua_trinh_cong_tac` |  |  |  |
| `giao_duc_pho_thong` | chuỗi (≤ 30) | `dao_tao` |  |  |  |
| `nam_tot_nghiep_pho_thong` | ngày không đủ | `dao_tao` |  |  |  |
| `chuyen_mon_nghiep_vu` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `ly_luan_chinh_tri` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `hoc_ham_hoc_vi_cao_nhat` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `ngoai_ngu` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `tin_hoc` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `tieng_dan_toc_thieu_so` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `quan_ly_nha_nuoc` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `boi_duong_chuc_danh_nghe_nghiep` | chuỗi (≤ 300) | `dao_tao` |  |  |  |
| `dao_tao[]` | mảng (≤ 60 phần tử) | `dao_tao` |  |  |  |
| `dao_tao[].id` | ObjectId | `dao_tao` |  | CSDL |  |
| `dao_tao[].ten_co_so_dao_tao` | chuỗi (≤ 300) | `dao_tao` |  | CSDL |  |
| `dao_tao[].nganh_hoc_ten_lop` | chuỗi (≤ 300) | `dao_tao` |  |  |  |
| `dao_tao[].tu` | ngày không đủ | `dao_tao` |  | CSDL |  |
| `dao_tao[].den` | ngày không đủ | `dao_tao` |  |  |  |
| `dao_tao[].dang_dien_ra` | đúng/sai | `dao_tao` |  |  |  |
| `dao_tao[].hinh_thuc_dao_tao` | chuỗi (≤ 100) | `dao_tao` |  |  |  |
| `dao_tao[].van_bang_chung_chi` | chuỗi (≤ 200) | `dao_tao` |  |  |  |
| `danh_hieu_duoc_phong` | chuỗi (≤ 300) | `khen_thuong` |  |  |  |
| `khen_thuong[]` | mảng (≤ 100 phần tử) | `khen_thuong` |  |  |  |
| `khen_thuong[].id` | ObjectId | `khen_thuong` |  | CSDL |  |
| `khen_thuong[].thoi_diem` | ngày không đủ | `khen_thuong` |  | CSDL |  |
| `khen_thuong[].so_quyet_dinh` | chuỗi (≤ 100) | `khen_thuong` |  |  |  |
| `khen_thuong[].co_quan_quyet_dinh` | chuỗi (≤ 200) | `khen_thuong` |  |  |  |
| `khen_thuong[].hinh_thuc_khen_thuong` | chuỗi (≤ 200) | `khen_thuong` |  |  |  |
| `khen_thuong[].danh_hieu_thi_dua` | chuỗi (≤ 200) | `khen_thuong` |  |  |  |
| `ma_so_ngach` | chuỗi (≤ 30) | `luong` | ● |  |  |
| `phu_cap_chuc_vu` | số | `luong` | ● |  |  |
| `phu_cap_kiem_nhiem` | số | `luong` | ● |  |  |
| `phu_cap_khac` | chuỗi (≤ 200) | `luong` | ● |  |  |
| `so_so_bhxh` | chuỗi (≤ 20) | `luong` | ● |  |  |
| `so_the_bhyt` | chuỗi (≤ 20) | `luong` | ● |  |  |
| `luong[]` | mảng (≤ 100 phần tử) | `luong` | ● |  |  |
| `luong[].id` | ObjectId | `luong` | ● | CSDL |  |
| `luong[].tu` | ngày không đủ | `luong` | ● | CSDL |  |
| `luong[].den` | ngày không đủ | `luong` | ● |  |  |
| `luong[].dang_dien_ra` | đúng/sai | `luong` | ● |  |  |
| `luong[].ma_so` | chuỗi (≤ 30) | `luong` | ● |  |  |
| `luong[].bac_luong` | chuỗi (≤ 30) | `luong` | ● |  |  |
| `luong[].he_so_luong` | số | `luong` | ● | CSDL |  |
| `luong[].tien_luong_vi_tri_viec_lam` | tiền (VND) | `luong` | ● |  |  |
| `ky_luat[]` | mảng (≤ 50 phần tử) | `ky_luat` | ● |  |  |
| `ky_luat[].id` | ObjectId | `ky_luat` | ● | CSDL |  |
| `ky_luat[].loai` | một trong: `dang`, `chinh_quyen` | `ky_luat` | ● | CSDL |  |
| `ky_luat[].thoi_diem` | ngày không đủ | `ky_luat` | ● | CSDL |  |
| `ky_luat[].het_hieu_luc` | ngày không đủ | `ky_luat` | ● |  |  |
| `ky_luat[].so_quyet_dinh` | chuỗi (≤ 100) | `ky_luat` | ● |  |  |
| `ky_luat[].co_quan_ban_hanh` | chuỗi (≤ 200) | `ky_luat` | ● |  |  |
| `ky_luat[].hinh_thuc` | chuỗi (≤ 200) | `ky_luat` | ● | CSDL |  |
| `ky_luat[].hanh_vi_vi_pham` | chuỗi (≤ 500) | `ky_luat` | ● |  |  |
| `tien_an_tien_su[]` | mảng (≤ 20 phần tử) | `tien_an_tien_su` | ● |  |  |
| `tien_an_tien_su[].id` | ObjectId | `tien_an_tien_su` | ● | CSDL |  |
| `tien_an_tien_su[].loai` | một trong: `tien_an`, `tien_su` | `tien_an_tien_su` | ● | CSDL |  |
| `tien_an_tien_su[].thoi_diem` | ngày không đủ | `tien_an_tien_su` | ● | CSDL |  |
| `tien_an_tien_su[].so_ban_an_quyet_dinh` | chuỗi (≤ 100) | `tien_an_tien_su` | ● |  |  |
| `tien_an_tien_su[].co_quan_ban_hanh` | chuỗi (≤ 200) | `tien_an_tien_su` | ● |  |  |
| `tien_an_tien_su[].hinh_thuc` | chuỗi (≤ 200) | `tien_an_tien_su` | ● |  |  |
| `tien_an_tien_su[].hanh_vi_vi_pham` | chuỗi (≤ 500) | `tien_an_tien_su` | ● |  |  |
| `doi_tuong_chinh_sach` | chuỗi (≤ 300) | `than_nhan` |  |  |  |
| `co_yeu_to_nuoc_ngoai` | có/không + mô tả | `than_nhan` |  |  |  |
| `lanh_dao_than_nhan_nuoc_ngoai` | có/không + mô tả | `than_nhan` |  |  |  |
| `than_nhan[]` | mảng (≤ 60 phần tử) | `than_nhan` |  |  |  |
| `than_nhan[].id` | ObjectId | `than_nhan` |  | CSDL |  |
| `than_nhan[].nhom` | một trong: `cua_ban_than`, `cua_vo_chong` | `than_nhan` |  | CSDL |  |
| `than_nhan[].quan_he` | một trong: `cha`, `me`, `nguoi_nuoi_duong`, `vo`, `chong`, `con`, `anh_chi_em` | `than_nhan` |  | CSDL |  |
| `than_nhan[].chi_tiet_quan_he` | một trong: `de`, `nuoi`, `dau`, `re`, `anh`, `chi`, `em` | `than_nhan` |  |  |  |
| `than_nhan[].ho_ten` | chuỗi (≤ 120) | `than_nhan` |  | CSDL |  |
| `than_nhan[].gioi_tinh` | một trong: `nam`, `nu` | `than_nhan` |  |  |  |
| `than_nhan[].ngay_sinh` | ngày không đủ | `than_nhan` |  | biểu mẫu |  |
| `than_nhan[].so_can_cuoc` | chuỗi (≤ 12) | `so_can_cuoc` | ● |  | mẫu `^[0-9]{9,12}$` |
| `than_nhan[].dan_toc` | chuỗi (≤ 50) | `than_nhan` |  |  |  |
| `than_nhan[].ton_giao` | chuỗi (≤ 50) | `than_nhan` |  |  | có thể là "Không" |
| `than_nhan[].quoc_tich` | chuỗi (≤ 50) | `than_nhan` |  |  |  |
| `than_nhan[].que_quan` | địa chỉ | `than_nhan` |  |  |  |
| `than_nhan[].noi_thuong_tru` | địa chỉ | `than_nhan` |  |  |  |
| `than_nhan[].noi_o_hien_nay` | địa chỉ | `than_nhan` |  |  |  |
| `than_nhan[].nghe_nghiep_noi_lam_viec` | chuỗi (≤ 300) | `than_nhan` |  |  |  |
| `than_nhan[].thai_do_chinh_tri` | chuỗi (≤ 500) | `than_nhan` |  |  |  |
| `than_nhan[].lien_quan_che_do_cu` | chuỗi (≤ 500) | `than_nhan` |  |  | có thể là "Không" |
| `than_nhan[].tien_an` | chuỗi (≤ 500) | `tien_an_tien_su` | ● |  | có thể là "Không" |
| `than_nhan[].nam_ket_hon_ly_hon` | kết hôn/ly hôn + năm | `than_nhan` |  |  |  |
| `than_nhan[].la_nguoi_phu_thuoc` | đúng/sai | `than_nhan` |  |  |  |
| `than_nhan[].tim_kiem` | chuỗi (≤ 150) | `than_nhan` |  | CSDL | nội bộ, không trả ra |

## Collection `nghi_phep`

| Đường dẫn | Kiểu | Mục | NC | Bắt buộc | Ghi chú |
|---|---|---|---|---|---|
| `_id` | ObjectId | kỹ thuật |  | CSDL |  |
| `created_at` | ngày | kỹ thuật |  | CSDL |  |
| `updated_at` | ngày | kỹ thuật |  | CSDL |  |
| `la_mau` | đúng/sai | kỹ thuật |  |  |  |
| `nhan_su_id` | ObjectId | `nghi_phep` | ● | CSDL |  |
| `tu_ngay` | ngày | `nghi_phep` | ● | CSDL |  |
| `den_ngay` | ngày | `nghi_phep` | ● | CSDL |  |
| `loai_phep` | một trong: `phep_nam`, `nghi_om`, `thai_san`, `viec_rieng`, `khong_luong`, `khac` | `nghi_phep` | ● | CSDL |  |
| `so_ngay` | số | `nghi_phep` | ● |  |  |
| `ghi_chu` | chuỗi (≤ 500) | `nghi_phep` | ● |  |  |

