'use strict';
const { MongoClient } = require('mongodb');

/** Kết nối bằng user ứng dụng (quyền tối thiểu). Không tạo/sửa cấu trúc: việc đó do script nâng cấp làm. */
async function ket_noi_mongo(cau_hinh_mongo) {
  const client = new MongoClient(`mongodb://${cau_hinh_mongo.may}:${cau_hinh_mongo.cong}/`, {
    auth: { username: cau_hinh_mongo.nguoi_dung, password: cau_hinh_mongo.mat_khau },
    authSource: cau_hinh_mongo.csdl, // user ứng dụng được tạo trong chính CSDL của ứng dụng
    directConnection: true,
    serverSelectionTimeoutMS: 5000,
    appName: 'hrm-api',
  });
  await client.connect();
  const db = client.db(cau_hinh_mongo.csdl);
  return { client, db };
}

module.exports = { ket_noi_mongo };
