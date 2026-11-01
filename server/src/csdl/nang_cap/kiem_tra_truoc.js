'use strict';
/** Kiểm tra TRƯỚC khi nâng cấp: phiên bản MongoDB và đặc quyền của user đang chạy script. Không thay đổi gì. */

const HANH_DONG_CAN_CO = Object.freeze([
  'createCollection', 'collMod', 'createIndex', 'dropIndex', 'find', 'insert', 'update', 'remove', 'renameCollectionSameDB',
]);

function co_hanh_dong(dac_quyen, csdl, hanh_dong) {
  return dac_quyen.some((p) => {
    const r = p.resource || {};
    const ap_dung = r.cluster === true ? false : (r.db === csdl || r.db === '') && (r.collection === '' || r.collection === undefined);
    return ap_dung && Array.isArray(p.actions) && p.actions.includes(hanh_dong);
  });
}

async function kiem_tra_truoc_chung(db, csdl) {
  const ket_qua = { loi: [], canh_bao: [], thong_tin: [], thieu_quyen: [], nguoi_dung_hien_tai: null, co_the_cap_quyen: false };
  try {
    const bi = await db.admin().command({ buildInfo: 1 });
    const phien_ban_chinh = Array.isArray(bi.versionArray) ? bi.versionArray[0] : Number(String(bi.version).split('.')[0]);
    if (phien_ban_chinh < 6) ket_qua.loi.push(`MongoDB ${bi.version} quá cũ; cần từ 6.0 trở lên (khuyến nghị bản 8.x).`);
    else ket_qua.thong_tin.push(`MongoDB ${bi.version}`);
  } catch (loi) {
    ket_qua.canh_bao.push(`Không đọc được phiên bản MongoDB (${loi.message}).`);
  }
  try {
    const tt = await db.admin().command({ connectionStatus: 1, showPrivileges: true });
    const dac_quyen = tt.authInfo && tt.authInfo.authenticatedUserPrivileges;
    const nguoi = tt.authInfo && tt.authInfo.authenticatedUsers && tt.authInfo.authenticatedUsers[0];
    ket_qua.nguoi_dung_hien_tai = nguoi ? { ten: nguoi.user, db: nguoi.db } : null;
    if (!Array.isArray(dac_quyen)) {
      ket_qua.canh_bao.push('Không đọc được đặc quyền của user hiện tại (MongoDB có thể chưa bật xác thực).');
    } else {
      ket_qua.thieu_quyen = HANH_DONG_CAN_CO.filter((h) => !co_hanh_dong(dac_quyen, csdl, h));
      ket_qua.co_the_cap_quyen = co_hanh_dong(dac_quyen, csdl, 'grantRole');
      if (ket_qua.thieu_quyen.length > 0) {
        ket_qua.loi.push(`User ${nguoi ? nguoi.user : '(không rõ)'} thiếu quyền trên CSDL ${csdl}: ${ket_qua.thieu_quyen.join(', ')}. `
          + `Cần vai trò dbOwner trên ${csdl}${ket_qua.co_the_cap_quyen ? ' (user này có thể tự cấp — script sẽ hỏi)' : ''}.`);
      }
    }
  } catch (loi) {
    ket_qua.canh_bao.push(`Không kiểm tra được đặc quyền (${loi.message}).`);
  }
  return ket_qua;
}

/** Cấp vai trò dbOwner trên CSDL cho user (dùng quyền userAdmin của chính user đó). */
async function cap_quyen_db_owner(db, ten_nguoi_dung, csdl) {
  await db.command({ grantRolesToUser: ten_nguoi_dung, roles: [{ role: 'dbOwner', db: csdl }] });
}

module.exports = { kiem_tra_truoc_chung, cap_quyen_db_owner, co_hanh_dong, HANH_DONG_CAN_CO };
