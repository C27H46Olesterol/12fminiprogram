// 云函数入口文件
const cloud = require('wx-server-sdk')
var rp = require('request-promise')
const crypto = require('crypto');
const buffer = require('../auth/miniprogram_npm/buffer');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database();
const _ = db.command;

const method = 'md5'
const version = '2022-05-01'
const product_id = 'OHjh4nsX2f';
const accessKey = 'E//da1W/C3uPMQfJddk5Y1WX22VrsSGV5XvXr4X5hT0='; // 替换为实际的 API Key
const et = Math.ceil((Date.now() + 3600000) / 1000);
const res = 'products/OHjh4nsX2f'

// 生成正确的 Authorization 签名
const base64Key = Buffer.from(accessKey, 'base64'); // accessKey base64编码
const StringForSignature = et + '\n' + method + '\n' + res + '\n' + version;
const sign = encodeURIComponent(crypto.createHmac(method, base64Key).update(StringForSignature).digest('base64'));
const encodeRes = encodeURIComponent(res);

//数据流格式上传（备用）
// async function setCommand(event){
//   const {onOff,temp,mode,fanSpeed,swing} = event;
//   const buf_on ='',
//   const bufs = Buffer.alloc(11)
//   console.log('二进制指令',bufs)
//   switch(command){
//     case 'setOn':{
//     }
//   }
// }

//oneJson格式
//测试用获取产品列表
async function getProductList(event) {
  try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/product/detail?product_id=${product_id}`,
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      json: true
    });
    console.log('获取产品列表：', res);
    return res.data || res;
  } catch (err) {
    console.log('获取产品列表异常：', err.message, '故障码：', err.statusCode);
    return err;
  }
}

/*
* 开机 powerStatus1
*/
async function setOn(event) {
  const deviceName = event
  try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'powerStatus': 1
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

/*
* 关机 powerStatus 0
*/
async function setOff(event){
  const deviceName = event
  try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'powerStatus': 0
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

//设置温度
async function setTemp(event){
  const {deviceName,temp} = event
  try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'setupTemper': temp
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

//左右摆风打开
async function setLefttoRigth(event){
  const deviceName = event
  try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'setupTemper': temp
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

//左右摆风关闭
async function setLefttoRigth(event){
  const deviceName = event
  try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'setupTemper': false
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

//前后摆风打开
async function setForwordtoBack(event){
  const deviceName = event
try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'setForwordtoBack': true
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

//前后摆风关闭
async function setForwordtoBack(event){
  const deviceName = event
try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'setForwordtoBack': true
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

//设置强劲模式
async function setStrongModel(event){
  const deviceName = event
  try {
      const res = await rp({
        url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
        },
        body: {
          'product_id': 'OHjh4nsX2f',
          'device_name': deviceName,
          'params': {
            'setStrongModel': true
          }
        },
        json: true
      });
      console.log('', res);
      return {
        status: 'success',
      }
    } catch (err) {
      console.log('', err.message,);
      return err;
    }
}

//设置节能模式
async function setEcoModel(event){
  const deviceName = event
try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'setEcoModel': true
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    console.log('', err.message,);
    return err;
  }
}

//设置自动模式
async function setAutoModel(event){
  const deviceName = event
try {
    const res = await rp({
      url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
      },
      body: {
        'product_id': 'OHjh4nsX2f',
        'device_name': deviceName,
        'params': {
          'setAutoModel': true
        }
      },
      json: true
    });
    console.log('', res);
    return {
      status: 'success',
    }
  } catch (err) {
    return {
      code:404,
      msg:'设置自动模式失败'
    };
  }
}


//获取用户已激活的设备列表
async function getActiveDeviceList(event) {
  const { userId, phone } = event

  try {
    // 第一步：从 activateProduct 表中查询数据
    const activateRes = await db.collection('activateProduct').where({
      userId: userId,
      phone: phone
    }).get()

    console.log("activateProduct查询结果:", activateRes.data)

    // 存储最终结果的数组
    const deviceList = []

    // 第二步：遍历每条 activateProduct 数据，根据 productCode 查询 scans 表
    for (let i = 0; i < activateRes.data.length; i++) {
      const activateItem = activateRes.data[i]
      const productCode = activateItem.productCode

      // 根据 productCode 在 scans 表中查询 sn 字段相同的数据
      const scansRes = await db.collection('scans').where({
        sn: productCode
      }).limit(1).get()

      console.log(`productCode ${productCode} 对应的scans数据:`, scansRes.data)

      // 将 activateProduct 数据和对应的 scans 数据组合
      // 只有当 scansRes.data 存在且有内容时才添加
      if (scansRes.data && scansRes.data.length > 0) {
        deviceList.push(scansRes.data[0])
      }
    }

    console.log("最终设备列表:", deviceList)

    return {
      success: true,
      data: deviceList,
      count: deviceList.length
    }

  } catch (error) {
    console.error("查询设备列表失败:", error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  switch (event.action) {
    case 'getProductList':
      return getProductList(event);
    case 'getActiveDeviceList':
      return getActiveDeviceList(event);
    case 'setCommand':
      return setCommand(event);
    default:
      return {
        errMsg: '未知的操作'
      };
  }

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    code: 0,
    message: 'success'
  }
}