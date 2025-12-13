
// 云函数入口函数
// cloudfunctions/scan_uploada/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  // 核心修复：自动判断数据来源格式
  let body = event
  if (event.body) {
      try { body = JSON.parse(event.body) } catch(e) {}
  }
  
  const { sn, imei } = body
  
  try {
    // 写入数据库
    const res = await db.collection('scans').add({
      data: {
        sn: sn,
        imei: imei,
        createTime: db.serverDate(),
        raw: body // 把收到的原始数据也存一份，方便找原因
      }
    })
    // 成功后返回：ID 和 收到的数据
    return { success: true, id: res._id, received_sn: sn }
  } catch (e) {
    // 失败后返回：错误原因
    return { success: false, error: e.toString(), input: body }
  }
}