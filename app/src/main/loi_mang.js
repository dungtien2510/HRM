'use strict';

const BANG = [
  [/ERR_CERT_COMMON_NAME_INVALID|ERR_CERT_NAME_INVALID|ERR_TLS_CERT_ALTNAME_INVALID|altnames?/i, 'CHUNG_CHI_SAI_TEN',
    'Chứng chỉ của máy chủ không khớp với địa chỉ đã nhập.',
    'Nhập đúng tên máy chủ có trong chứng chỉ (vd hrm.tieudoantt.local) hoặc nhờ quản trị cấp lại chứng chỉ.'],
  [/ERR_CERT_DATE_INVALID|ERR_CERT_NOT_YET_VALID|CERT_HAS_EXPIRED|CERT_NOT_YET_VALID/i, 'CHUNG_CHI_HET_HAN',
    'Chứng chỉ của máy chủ đã hết hạn hoặc chưa có hiệu lực.',
    'Kiểm tra ngày giờ của máy này; nếu đúng, báo quản trị cấp lại chứng chỉ.'],
  [/ERR_CERT_AUTHORITY_INVALID|ERR_CERT_ROOT_UNTRUSTED|SELF[_ -]SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER/i, 'CHUNG_CHI_KHONG_TIN_CAY',
    'Máy này chưa tin cậy chứng chỉ của máy chủ.',
    'Cài chứng chỉ gốc nội bộ (hrm_goc.cer) vào máy này theo docs/02_may_lam_viec.md rồi thử lại.'],
  [/ERR_CERT_|ERR_SSL_|ERR_BAD_SSL|SSL_PROTOCOL|ERR_TLS|WRONG_VERSION_NUMBER/i, 'CHUNG_CHI_LOI',
    'Không thiết lập được kết nối an toàn (HTTPS) với máy chủ.',
    'Kiểm tra địa chỉ và cổng; cổng này phải là cổng HTTPS của API HRM.'],
  [/ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED|ENOTFOUND|EAI_AGAIN/i, 'KHONG_TIM_THAY_MAY_CHU',
    'Không tìm thấy máy chủ theo tên đã nhập.',
    'Kiểm tra chính tả, hoặc thêm dòng "<IP máy chủ> hrm.tieudoantt.local" vào file hosts (docs/02_may_lam_viec.md).'],
  [/ERR_CONNECTION_REFUSED|ECONNREFUSED/i, 'MAY_CHU_TU_CHOI',
    'Máy chủ từ chối kết nối.',
    'Dịch vụ API (HrmApi) có thể chưa chạy hoặc sai cổng.'],
  [/ERR_CONNECTION_TIMED_OUT|ERR_TIMED_OUT|ETIMEDOUT|TimeoutError|AbortError|aborted|timed out/i, 'QUA_THOI_GIAN',
    'Máy chủ không phản hồi kịp thời.',
    'Máy chủ có thể đang tắt, hoặc tường lửa chưa cho phép địa chỉ IP của máy này.'],
  [/ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED|ERR_ADDRESS_UNREACHABLE|ENETUNREACH|EHOSTUNREACH|ERR_NETWORK_ACCESS_DENIED/i, 'MANG_KHONG_KHA_DUNG',
    'Máy này không kết nối được tới mạng nội bộ.',
    'Kiểm tra dây mạng/Wi-Fi của máy.'],
  [/ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|ERR_EMPTY_RESPONSE|ECONNRESET/i, 'KET_NOI_BI_NGAT',
    'Kết nối tới máy chủ bị ngắt giữa chừng.',
    'Thử lại sau ít phút; nếu lặp lại, báo quản trị.'],
];

/** Chuyển lỗi mạng (từ net.fetch / Node) thành mã + thông điệp tiếng Việt cho người dùng. */
function phan_loai_loi_mang(loi) {
  const nguyen_nhan = loi && loi.cause;
  const chuoi = [loi && loi.name, loi && loi.message, loi && loi.code, nguyen_nhan && nguyen_nhan.message, nguyen_nhan && nguyen_nhan.code]
    .filter(Boolean).join(' | ');
  for (const [mau, ma, thong_diep, goi_y] of BANG) {
    if (mau.test(chuoi)) return { ma, thong_diep, goi_y };
  }
  return { ma: 'LOI_KET_NOI_KHAC', thong_diep: 'Không kết nối được tới máy chủ.', goi_y: 'Thử lại; nếu vẫn lỗi, báo quản trị.' };
}

module.exports = { phan_loai_loi_mang };
