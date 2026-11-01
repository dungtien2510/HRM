'use strict';
const { ObjectId } = require('mongodb');

/**
 * Kho dữ liệu trên MongoDB. Mọi truy vấn dùng đối tượng có tham số (không ghép chuỗi).
 * Giá trị đầu vào phải là chuỗi đúng kiểu để chặn chèn toán tử ({ $gt: '' }).
 * API chỉ đọc/ghi dữ liệu; cấu trúc, chỉ mục, validator do script nâng cấp quản lý (xem src/csdl/).
 */
const MAU_ID = /^[0-9a-f]{24}$/i;

function tao_kho_mongo(db) {
  const nguoi_dung = db.collection('nguoi_dung');
  const luot = db.collection('luot_dang_nhap');
  const nhat_ky = db.collection('nhat_ky');
  const cau_hinh = db.collection('cau_hinh');

  return Object.freeze({
    nguoi_dung: Object.freeze({
      async tim_theo_ten(ten) {
        if (typeof ten !== 'string') return null;
        return nguoi_dung.findOne({ ten_dang_nhap: ten });
      },
      async tim_theo_id(id) {
        if (typeof id !== 'string' || !MAU_ID.test(id)) return null;
        return nguoi_dung.findOne({ _id: new ObjectId(id) });
      },
      async tao(doc) {
        const kq = await nguoi_dung.insertOne(doc);
        return { ...doc, _id: kq.insertedId };
      },
      async dem_theo_loai(loai) {
        return nguoi_dung.countDocuments({ loai });
      },
      /** Bộ đếm hiển thị (so_lan_sai); việc khóa tạm do luot_dang_nhap quyết định. */
      async ghi_nhan_dang_nhap_sai(id) {
        if (typeof id !== 'string' || !MAU_ID.test(id)) return;
        await nguoi_dung.updateOne({ _id: new ObjectId(id) }, { $inc: { so_lan_sai: 1 }, $set: { lan_sai_cuoi: new Date() } });
      },
      async ghi_nhan_dang_nhap_dung(id) {
        if (typeof id !== 'string' || !MAU_ID.test(id)) return;
        await nguoi_dung.updateOne({ _id: new ObjectId(id) }, { $set: { so_lan_sai: 0, dang_nhap_cuoi: new Date() } });
      },
    }),
    luot_dang_nhap: Object.freeze({
      async them({ khoa, luc, het_han }) {
        const kq = await luot.insertOne({ khoa, luc, het_han });
        return kq.insertedId;
      },
      async liet_ke(khoa, tu_luc) {
        const ds = await luot.find({ khoa, luc: { $gt: tu_luc } }, { projection: { luc: 1 } })
          .sort({ luc: 1, _id: 1 }).toArray();
        return ds.map((d) => ({ id: d._id, luc: d.luc }));
      },
      async xoa_theo_id(ids) {
        if (!ids || ids.length === 0) return;
        await luot.deleteMany({ _id: { $in: ids } });
      },
      async xoa_theo_khoa(khoa) {
        await luot.deleteMany({ khoa });
      },
    }),
    nhat_ky: Object.freeze({
      async ghi(doc) {
        await nhat_ky.insertOne(doc);
      },
    }),
    cau_hinh: Object.freeze({
      async lay(ma) {
        return cau_hinh.findOne({ _id: ma });
      },
    }),
  });
}

module.exports = { tao_kho_mongo };
