// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const _ = db.command

  console.log('activateProduct云函数被调用:', event)

  try {
    const { action } = event

    switch (action) {
      case 'checkProductActivation':
        return await checkProductActivation(db, event, wxContext)

      case 'getActivationByProductCode':
        return await getActivationByProductCode(db, event, wxContext)

      case 'updateActivation':
        return await updateActivation(db, event, wxContext)

      case 'deleteActivation':
        return await deleteActivation(db, event, wxContext)

      case 'getAllActivations':
        return await getAllActivations(db, event, wxContext)

      case 'submitProductActivation':
        return await submitProductActivation(db, event, wxContext)
      
      case 'getActivationByPhoneNumber':
        return await getActivationByPhoneNumber(db, event, wxContext)

      default:
        return {
          success: false,
          message: '未知的操作类型',
          code: 400
        }
    }
  } catch (error) {
    console.error('activateProduct云函数执行错误:', error)
    return {
      success: false,
      message: error.message || '系统错误',
      code: 500
    }
  }
}

// 检查产品是否已激活
async function checkProductActivation(db, event, wxContext) {
  const { productCode } = event

  if (!productCode) {
    return {
      success: false,
      message: '产品码不能为空',
      code: 400
    }
  }

  try {
    const result = await db.collection('activateProduct')
      .where({
        productCode: productCode.trim(),
        status: 'activated'
      })
      .orderBy('activationTime', 'desc')
      .limit(1)
      .get()

    if (result.data && result.data.length > 0) {
      return {
        success: true,
        data: {
          isActivated: true,
          activationTime: result.data[0].activationTime,
          record: result.data[0]
        },
        message: '产品已激活'
      }
    } else {
      return {
        success: true,
        data: {
          isActivated: false
        },
        message: '产品未激活'
      }
    }
  } catch (error) {
    console.error('检查产品激活状态失败:', error)
    throw new Error('检查失败，请重试')
  }
}

// 根据产品码查询激活记录
async function getActivationByProductCode(db, event, wxContext) {
  const { productCode } = event

  if (!productCode) {
    return {
      success: false,
      message: '产品码不能为空',
      code: 400
    }
  }

  try {
    const result = await db.collection('activateProduct')
      .where({
        productCode: productCode.trim()
      })
      .orderBy('createTime', 'desc')
      .get()

    return {
      success: true,
      data: result.data,
      message: '查询成功'
    }
  } catch (error) {
    console.error('查询激活记录失败:', error)
    throw new Error('查询失败，请重试')
  }
}

// 根据用户手机号查询激活记录
async function getActivationByPhoneNumber(db, event, wxContext) {
  const { phoneNumber } = event

  if (!phoneNumber) {
    return {
      success: false,
      message: '手机号不能为空',
      code: 400
    }
  }

  try {
    const result = await db.collection('activateProduct')
      .where({
        userPhone: phoneNumber.trim() // 根据用户手机号查询
      })
      .orderBy('createTime', 'desc')
      .get()

    return {
      success: true,
      data: result.data,
      message: '查询成功'
    }
  } catch (error) {
    console.error('查询激活记录失败:', error)
    throw new Error('查询失败，请重试')
  }
}


// 更新激活记录
async function updateActivation(db, event, wxContext) {
  const { productCode, updateData } = event

  if (!productCode || !updateData) {
    return {
      success: false,
      message: '产品码和更新数据不能为空',
      code: 400
    }
  }

  try {
    // 查找要更新的记录
    const queryResult = await db.collection('activateProduct')
      .where({ productCode: productCode.trim() })
      .limit(1)
      .get()

    if (!queryResult.data || queryResult.data.length === 0) {
      return {
        success: false,
        message: '未找到对应的激活记录',
        code: 404
      }
    }

    const recordId = queryResult.data[0]._id

    // 更新记录
    const updateDataWithTime = {
      ...updateData,
      updateTime: new Date()
    }

    const result = await db.collection('activateProduct')
      .doc(recordId)
      .update({
        data: updateDataWithTime
      })

    return {
      success: true,
      data: result,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新激活记录失败:', error)
    throw new Error('更新失败，请重试')
  }
}

// 删除激活记录
async function deleteActivation(db, event, wxContext) {
  const { productCode } = event

  if (!productCode) {
    return {
      success: false,
      message: '产品码不能为空',
      code: 400
    }
  }

  try {
    // 查找要删除的记录
    const queryResult = await db.collection('activateProduct')
      .where({ productCode: productCode.trim() })
      .limit(1)
      .get()

    if (!queryResult.data || queryResult.data.length === 0) {
      return {
        success: false,
        message: '未找到对应的激活记录',
        code: 404
      }
    }

    const recordId = queryResult.data[0]._id

    // 删除记录
    const result = await db.collection('activateProduct')
      .doc(recordId)
      .remove()

    return {
      success: true,
      data: result,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除激活记录失败:', error)
    throw new Error('删除失败，请重试')
  }
}

// 获取所有激活记录（分页）
async function getAllActivations(db, event, wxContext) {
  const { page = 1, pageSize = 20 } = event

  try {
    const skip = (page - 1) * pageSize

    // 获取总数
    const totalResult = await db.collection('activateProduct')
      .count()

    // 获取分页数据
    const dataResult = await db.collection('activateProduct')
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: {
        list: dataResult.data,
        total: totalResult.total,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalResult.total / pageSize)
      },
      message: '查询成功'
    }
  } catch (error) {
    console.error('获取激活记录列表失败:', error)
    throw new Error('查询失败，请重试')
  }
}

// 提交产品激活
async function submitProductActivation(db, event, wxContext) {
  const {
    userId,
    openId,
    submitterPhone,
    submitterRole,
    productCode,
    licensePlate,
    userPhone,
    installerPhone,
    processImages,
    finishImages,
    location,
    submitTime
  } = event

  // 参数校验
  if (!productCode || !licensePlate || !userPhone || !installerPhone) {
    return {
      success: false,
      message: '缺少必要参数',
      code: 400
    }
  }

  // 手机号格式校验
  const phoneRegex = /^1[3-9]\d{9}$/
  if (!phoneRegex.test(userPhone) || !phoneRegex.test(installerPhone)) {
    return {
      success: false,
      message: '手机号格式不正确',
      code: 400
    }
  }

  // 检查产品是否存在及出库状态
  const productRecord = await db.collection('product')
    .where({
      bar_code: productCode.trim()
    })
    .limit(1)
    .get()

  if (!productRecord.data || productRecord.data.length === 0) {
    return {
      success: false,
      message: '该机器不存在',
      code: 404
    }
  }

  const product = productRecord.data[0]
  if (product.is_outbound_text !== '已出库') {
    return {
      success: false,
      message: '该机器需要先出库',
      code: 400
    }
  }

  try {
    // 检查产品是否已激活
    const existingRecord = await db.collection('activateProduct')
      .where({
        productCode: productCode.trim(),
        status: 'activated'
      })
      .limit(1)
      .get()

    if (existingRecord.data && existingRecord.data.length > 0) {
      return {
        success: false,
        message: '该产品已激活，无法重复激活',
        code: 409
      }
    }

    try{
      //通过产品码获取该机器的imei码
      const scansRes = db.collection("scans").where({
        sn: snCode
      }).get().limit(1)
      //地址
      const imei = scansRes.data[0].imei
      //通过imei码向设备请求机器现在地址
      const res = await rp({
        url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
        },
        body: {
          'product_id': 'OHjh4nsX2f',
          'device_name': imei,
          'params': {
            'getAddress': true
          }
        },
        json: true
      });
      //获取到的地址
      const productAddress = res.data.address;
      //根据sn码查询经销商地址
      const outRes = db.collection("out").where({
        sn: snCode
      }).get().limit(1)

      const outAddress = outRes.data[0].address
      //对比地址信息错误返回
      if(productAddress !== outAddress){
        return{
          success: false,
          message: "机器溯源出现问题，请联系经销商",
          code: 408
        }
      }
      //正常激活，发送激活信息
      const activeQuest = await rp({
        url: `https://iot-api.heclouds.com/thingmodel/set-device-property`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Authorization': `version=${version}&res=${encodeRes}&et=${et}&method=${method}&sign=${sign}`
        },
        body: {
          'product_id': 'OHjh4nsX2f',
          'device_name': imei,
          'params': {
            'active': true
          }
        },
        json: true
      });
    }catch(err){

    }

    // 创建激活记录
    const activationData = {
      productCode: productCode.trim(),
      licensePlate: licensePlate.trim(),
      userPhone: userPhone.trim(),
      installerPhone: installerPhone.trim(),
      processImages: processImages || [],
      finishImages: finishImages || [],
      location: location || null,
      submitTime: submitTime ? new Date(submitTime) : new Date(),
      activationTime: new Date(), // 自动设置为激活时间
      status: 'activated', // 直接设置为已激活状态
      submitterPhone: submitterPhone || userPhone,
      submitterRole: submitterRole || 'user',
      userId: userId || null,
      openId: openId || wxContext.OPENID,
      createTime: new Date(),
      updateTime: new Date()
    }

    const result = await db.collection('activateProduct')
      .add({
        data: activationData
      })
    console.log('产品激活成功:', result)
    return{
      success: true,
      message:'产品激活成功',
      // code: 200
    }
  } catch (error) {
    console.error('提交产品激活失败:', error)
    if (error.code === 'DATABASE_PERMISSION_DENIED') {
      return {
        success: false,
        message: '权限不足，无法激活产品',
        code: 403
      }
    }
    throw new Error('激活失败，请重试')
  }
}