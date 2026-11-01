'use strict';
const { kiem_tra_validator } = require('./kiem_tra_schema');

/**
 * CSDL giả (bộ nhớ) cho kiểm thử logic tạo cấu trúc/nâng cấp. Mô phỏng đúng những gì thư viện dùng:
 * listCollections, createCollection, collMod, rolesInfo/updateRole, collection(...).{indexes, createIndex, dropIndex,
 * find, findOne, insertOne, insertMany, replaceOne, updateOne, countDocuments, rename, deleteMany}.
 * Có VALIDATOR thật (bằng kiem_tra_schema) nên dữ liệu chuyển đổi phải đạt schema mới như trên MongoDB.
 */
const loi_mongo = (ma, thong_diep) => Object.assign(new Error(thong_diep), { code: ma });

function tao_db_gia({ phien_ban = [8, 0, 1], dac_quyen = undefined, co_vai_tro = true } = {}) {
  const cols = new Map();
  const nhat_ky_thao_tac = [];
  const vai_tro = new Map(co_vai_tro ? [['vai_tro_hrm_ung_dung', { privileges: [] }]] : []);
  const ghi = (...x) => nhat_ky_thao_tac.push(x);
  const tien_xu_ly = { loi_khi_tao: null }; // dùng để giả lập lỗi giữa chừng: { ten: 'collection', lan: 1 }

  function lay(ten) { const c = cols.get(ten); if (!c) throw loi_mongo(26, `ns không tồn tại: ${ten}`); return c; }
  function kiem_tra_ghi(ten, doc) {
    const v = cols.get(ten) && cols.get(ten).options.validator;
    if (!v) return;
    const loi = kiem_tra_validator(v, doc);
    if (loi.length > 0) throw Object.assign(loi_mongo(121, 'Document failed validation'), { chi_tiet: loi });
  }
  const khop = (filter, d) => Object.entries(filter).every(([k, gt]) => {
    if (k === '$nor') return true;
    return JSON.stringify(d[k]) === JSON.stringify(gt);
  });

  function tao_collection(ten) {
    const tu_tao = () => { if (!cols.has(ten)) { cols.set(ten, { docs: [], indexes: [{ v: 2, key: { _id: 1 }, name: '_id_' }], options: {} }); ghi('autoCreate', ten); } return cols.get(ten); };
    return {
      async indexes() { return structuredClone(lay(ten).indexes); },
      async createIndex(key, opts = {}) {
        const c = tu_tao();
        const co_san = c.indexes.find((i) => i.name === opts.name);
        const dinh_nghia = { v: 2, key, ...opts };
        if (co_san) {
          if (JSON.stringify(co_san) === JSON.stringify(dinh_nghia)) return opts.name;
          throw loi_mongo(85, 'IndexOptionsConflict');
        }
        if (c.indexes.some((i) => JSON.stringify(i.key) === JSON.stringify(key))) throw loi_mongo(85, 'Index đã có với tên khác');
        c.indexes.push(dinh_nghia);
        ghi('createIndex', ten, opts.name);
        return opts.name;
      },
      async dropIndex(ten_chi_muc) {
        const c = lay(ten);
        if (ten_chi_muc === '_id_') throw loi_mongo(72, 'không xóa được _id_');
        const vt = c.indexes.findIndex((i) => i.name === ten_chi_muc);
        if (vt < 0) throw loi_mongo(27, 'IndexNotFound');
        c.indexes.splice(vt, 1);
        ghi('dropIndex', ten, ten_chi_muc);
      },
      find(filter = {}) { return { toArray: async () => structuredClone((cols.get(ten) ? cols.get(ten).docs : []).filter((d) => khop(filter, d))) }; },
      async findOne(filter = {}) { const c = cols.get(ten); return c ? structuredClone(c.docs.find((d) => khop(filter, d)) ?? null) : null; },
      async insertOne(doc) {
        if (tien_xu_ly.loi_khi_tao && tien_xu_ly.loi_khi_tao.ten === ten) { tien_xu_ly.loi_khi_tao = null; throw new Error('lỗi giả lập khi ghi'); }
        const c = tu_tao(); kiem_tra_ghi(ten, doc); c.docs.push(structuredClone(doc)); return { insertedId: doc._id };
      },
      async insertMany(ds) { for (const d of ds) await this.insertOne(d); },
      async replaceOne(filter, doc, opts = {}) {
        if (tien_xu_ly.loi_khi_tao && tien_xu_ly.loi_khi_tao.ten === ten) { tien_xu_ly.loi_khi_tao = null; throw new Error('lỗi giả lập khi ghi'); }
        const c = tu_tao();
        kiem_tra_ghi(ten, doc);
        const vt = c.docs.findIndex((d) => khop(filter, d));
        if (vt >= 0) c.docs[vt] = structuredClone(doc);
        else if (opts.upsert) c.docs.push(structuredClone(doc));
        ghi('replaceOne', ten);
      },
      async updateOne(filter, cap_nhat, opts = {}) {
        const c = tu_tao();
        let d = c.docs.find((x) => khop(filter, x));
        let moi = false;
        if (!d) { if (!opts.upsert) return { matchedCount: 0 }; d = { ...structuredClone(filter) }; moi = true; }
        const ban_sao = structuredClone(d);
        Object.assign(ban_sao, structuredClone(cap_nhat.$set || {}));
        if (moi) Object.assign(ban_sao, structuredClone(cap_nhat.$setOnInsert || {}));
        kiem_tra_ghi(ten, ban_sao);
        if (moi) c.docs.push(ban_sao); else c.docs[c.docs.indexOf(d)] = ban_sao;
        return { matchedCount: moi ? 0 : 1 };
      },
      async countDocuments(filter = {}) {
        const c = cols.get(ten);
        if (!c) return 0;
        if (filter.$nor) return c.docs.filter((d) => filter.$nor.some((v) => kiem_tra_validator(v, d).length === 0) === false).length;
        return c.docs.filter((d) => khop(filter, d)).length;
      },
      async deleteMany() { const c = cols.get(ten); const n = c ? c.docs.length : 0; if (c) c.docs = []; return { deletedCount: n }; },
      async rename(moi) {
        const c = lay(ten);
        if (cols.has(moi)) throw loi_mongo(48, 'NamespaceExists');
        cols.delete(ten); cols.set(moi, c); ghi('rename', ten, moi);
      },
    };
  }

  const db = {
    _cols: cols,
    _thao_tac: nhat_ky_thao_tac,
    _vai_tro: vai_tro,
    _tien_xu_ly: tien_xu_ly,
    listCollections(filter = {}, tuy_chon = {}) {
      const ds = [...cols.entries()].filter(([ten]) => !filter.name || ten === filter.name)
        .map(([ten, c]) => (tuy_chon.nameOnly ? { name: ten } : { name: ten, options: structuredClone(c.options) }));
      return { toArray: async () => ds };
    },
    async createCollection(ten, options = {}) {
      if (cols.has(ten)) throw loi_mongo(48, 'NamespaceExists');
      cols.set(ten, { docs: [], indexes: [{ v: 2, key: { _id: 1 }, name: '_id_' }], options: structuredClone(options) });
      ghi('createCollection', ten);
    },
    async command(lenh) {
      if (lenh.collMod) {
        const c = lay(lenh.collMod);
        c.options.validator = structuredClone(lenh.validator);
        c.options.validationLevel = lenh.validationLevel;
        c.options.validationAction = lenh.validationAction;
        ghi('collMod', lenh.collMod);
        return { ok: 1 };
      }
      if ('rolesInfo' in lenh) return { roles: vai_tro.has(lenh.rolesInfo) ? [{ role: lenh.rolesInfo }] : [] };
      if (lenh.updateRole) { vai_tro.set(lenh.updateRole, { privileges: structuredClone(lenh.privileges) }); ghi('updateRole', lenh.updateRole); return { ok: 1 }; }
      throw new Error(`Lệnh chưa hỗ trợ trong db giả: ${Object.keys(lenh)[0]}`);
    },
    admin() {
      return {
        async command(lenh) {
          if (lenh.buildInfo) return { version: phien_ban.join('.'), versionArray: phien_ban };
          if (lenh.connectionStatus) {
            return { authInfo: { authenticatedUsers: [{ user: 'hrm_quan_tri_mongo', db: 'admin' }], authenticatedUserPrivileges: dac_quyen } };
          }
          throw new Error('lệnh admin chưa hỗ trợ');
        },
      };
    },
    collection: (ten) => tao_collection(ten),
  };
  return db;
}

module.exports = { tao_db_gia, loi_mongo };
