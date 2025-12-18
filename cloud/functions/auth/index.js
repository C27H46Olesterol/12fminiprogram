// cloud/functions/auth/index.js - 用户认证云函数（简化版）

const cloud = require('wx-server-sdk');
var rp = require('request-promise');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

//声明数据库使用方法
const db = cloud.database();
const _ = db.command;

function createSuccessResponse(data, message = '操作成功') {
  return {
    success: true,
    message,
    data
  };
}

/**
 * 创建错误响应
 */
function createErrorResponse(message, code = 400) {
  return {
    success: false,
    error: {
      code,
      message
    }
  };
}

/**
 * 检查是否为管理员手机号
 */
function isAdminPhone(phone) {
  // 测试用的管理员手机号（个人账户测试）
  const adminPhones = [
    '15562406511', // 超级管理员手机号
    '13800138000', // 测试管理员手机号1
    // '13900139000', // 已改为测试维修工
    '13700137000', // 测试管理员手机号2
    '15600000000'  // 通用测试手机号
  ];

  return adminPhones.includes(phone);
}

/**
 * 检查是否为维修工手机号
 */
function isWorkerPhone(phone) {
  // 测试用的维修工手机号
  const workerPhones = [
    '13900139000', // 测试维修工
    '13900139001', // 测试维修工2
    '13900139002'  // 测试维修工3
  ];

  return workerPhones.includes(phone);
}

/**
 * 手机号登录处理函数
 */
async function phoneNumberLogin(event) {
  try {
    const { phone } = event;

    if (!phone) {
      return {
        success: false,
        message: '手机号不能为空'
      };
    }

    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return {
        success: false,
        message: '手机号格式不正确'
      };
    }

    console.log('手机号登录请求:', phone);

    // 先查询数据库，看用户是否已存在
    const userQuery = await db.collection('users').where({
      phone: phone
    }).get();

    let userInfo;
    let token;

    if (userQuery.data && userQuery.data.length > 0) {
      // 用户已存在，从数据库读取角色信息
      const existingUser = userQuery.data[0];
      console.log('找到已存在用户，使用数据库角色:', existingUser.role);

      // 更新最后登录时间
      await db.collection('users').doc(existingUser._id).update({
        data: {
          lastLoginTime: new Date(),
          loginCount: _.inc(1)
        }
      });

      userInfo = {
        userId: existingUser._id,
        phone: existingUser.phone,
        nickname: existingUser.nickname,
        avatarUrl: existingUser.avatar || '',
        role: existingUser.role, // 使用数据库中的角色
        status: existingUser.status || 'active',
        createTime: existingUser.createTime,
        lastLoginTime: new Date(),
        loginCount: (existingUser.loginCount || 0) + 1
      };

      token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    } else {
      // 新用户，使用硬编码规则分配角色
      // const userRole = getUserRoleByPhone(phoneNumber);
      // console.log('新用户注册，使用硬编码角色:', userRole);
      //

      //微信短信验证码接口验证手机号
      // wx.request({
      //   url:'',
      //   method:'GET',
      //   data:{

      //   },
      //   succestt:(res)=>{
      //     this.setData({
      //       userInfo: res.user_info,
      //       loginInfo: res.login_info
      //     })
      //   }
      // })

      //新用户 默认为client
      const userRole = 'client';

      //通过字符串拼接设置用户ID
      const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

      userInfo = {
        userId: newUserId,
        phone: phone,
        nickname: '用户' + phone,
        avatarUrl: '',
        role: userRole,
        status: 'active',
        createTime: new Date(),
        lastLoginTime: new Date(),
        loginCount: 1
      };

      // 保存到数据库
      try {
        await db.collection('users').add({
          data: {
            _id: newUserId,
            phone: phone,
            nickname: userInfo.nickname,
            avatar: '',
            role: userRole,
            status: 'active',
            createTime: new Date(),
            updateTime: new Date(),
            lastLoginTime: new Date(),
            loginCount: 1
          }
        });
        console.log('新用户已保存到数据库');
      } catch (dbError) {
        console.error('保存新用户到数据库失败:', dbError);
      }

      token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    console.log('手机号登录成功，最终角色:', userInfo.role);

    return {
      success: true,
      message: '登录成功',
      data: {
        userInfo: userInfo,
        token: token
      }
    };

  } catch (error) {
    console.error('手机号登录错误:', error);
    return {
      success: false,
      message: '登录失败，请重试'
    };
  }
}

/**
 * 根据手机号分配用户角色
 */
function assignUserRole(phoneNumber) {
  // 检查是否为管理员手机号
  if (isAdminPhone(phoneNumber)) {
    return 'admin';
  }

  // 默认角色为用户
  return 'user';
}

/**
 * 检查管理员权限
 */
async function checkAdminPermission(event) {
  try {
    const { phone } = event;

    if (!phone) {
      return createErrorResponse('缺少手机号参数');
    }

    const isAdmin = isAdminPhone(phone);

    return createSuccessResponse({
      isAdmin: isAdmin,
      phone: phone
    }, isAdmin ? '该手机号具有管理员权限' : '该手机号不是管理员');

  } catch (error) {
    console.error('检查管理员权限失败:', error);
    return createErrorResponse('检查管理员权限失败: ' + error.message);
  }
}

//获取用户openid and session_key
async function userLoginCheck(event) {
  const code = event.code;
  try {
    const res = rp({
      url: 'https://api.weixin.qq.com/sns/jscode2session?appid=' + proccess.env.APPID + '&secret=' + proccess.env.SECRET + '&js_code=' + code + '&grant_type=authorization_code',
      method: 'GET',
      success(res) {

      },
      fail(error) {
        console.log('请求失败：', error)
      }
    })
    console.log('返回数据:', res)
    return res
  } catch (error) {
    return {
      error
    }
  }

}

//check session_key 
async function checkSessionKey(event) {
  const session_key = event.session_key;
  const openid = event.openid;
  const signature = hmac_sha256(session_key, "")
  try {
    rp({
      url: 'https://api.weixin.qq.com/wxa/checksession?access_token=' + cloudbase_access_token + '&signature=' + signature + '&openid=' + openid + '&sig_method=hmac_sha256',
      method: 'GET',
      success(res) {

      },
      fail(error) {
        return []
      }
    })
    return res
  } catch (error) {

  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(event) {
  try {
    const { userId, token, phone, department, position } = event;

    if (!userId || !token) {
      return createErrorResponse('缺少用户信息');
    }

    // 验证用户
    const userResult = await db.collection('users').doc(userId).get();
    if (!userResult.data) {
      return createErrorResponse('用户不存在');
    }

    const updateData = {
      updateTime: new Date()
    };

    if (phone) updateData.phone = phone;
    if (department) updateData.department = department;
    if (position) updateData.position = position;

    await db.collection('users').doc(userId).update({
      data: updateData
    });

    return createSuccessResponse(null, '用户信息更新成功');

  } catch (error) {
    return createErrorResponse('更新失败: ' + error.message);
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(event) {
  try {
    const { userId, token } = event;

    if (!userId || !token) {
      return createErrorResponse('缺少用户信息');
    }

    // 查询用户信息
    const userResult = await db.collection('users').doc(userId).get();

    if (!userResult.data) {
      return createErrorResponse('用户不存在');
    }

    const user = userResult.data;

    const userInfo = {
      userId: user._id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      status: user.status,
      permissions: user.permissions,
      department: user.department,
      position: user.position,
      createTime: user.createTime,
      lastLoginTime: user.lastLoginTime,
      loginCount: user.loginCount,
      latitude: user.latitude,
      longitude: user.longitude,
      address: user.address,
      region: user.region
    };

    return createSuccessResponse(userInfo);

  } catch (error) {
    return createErrorResponse(error.message);
  }
}

/**
 * 修改用户角色（管理员功能）
 */
async function changeUserRole(event) {
  try {
    const { adminUserId, adminToken, userId, role } = event;

    if (!adminUserId || !adminToken) {
      return createErrorResponse('缺少管理员信息');
    }

    if (!userId || !role) {
      return createErrorResponse('参数不完整');
    }

    // 验证管理员权限
    const adminResult = await db.collection('users').doc(adminUserId).get();
    if (!adminResult.data || adminResult.data.role !== 'admin') {
      return createErrorResponse('权限不足');
    }

    const validRoles = ['client', 'manager', 'worker', 'admin'];
    if (!validRoles.includes(role)) {
      return createErrorResponse('无效的角色');
    }

    // 检查目标用户是否存在
    const userResult = await db.collection('users').doc(userId).get();
    if (!userResult.data) {
      return createErrorResponse('用户不存在');
    }

    const user = userResult.data;

    // 准备更新数据
    const updateData = {
      role,
      updateTime: new Date()
    };

    // 如果用户没有 _openid，使用其 _id 作为 _openid
    // 这样云函数才能通过 _openid 找到用户
    if (!user._openid) {
      console.log('用户缺少 _openid，使用 _id 作为 _openid:', user._id);
      updateData._openid = user._id;
    }

    // 更新用户角色
    await db.collection('users').doc(userId).update({
      data: updateData
    });

    console.log('用户角色修改成功，userId:', userId, '新角色:', role);

    return createSuccessResponse(null, '用户角色修改成功');

  } catch (error) {
    return createErrorResponse('修改失败: ' + error.message);
  }
}

/**
 * 获取用户列表（管理员功能）
 */
async function getUserList(event) {
  try {
    const { adminUserId, adminToken, page = 1, pageSize = 20, role = '', status = '' } = event;

    if (!adminUserId || !adminToken) {
      return createErrorResponse('缺少管理员信息');
    }

    // 验证管理员权限
    const adminResult = await db.collection('users').doc(adminUserId).get();
    if (!adminResult.data || adminResult.data.role !== 'admin') {
      return createErrorResponse('权限不足');
    }

    let query = {};

    if (role) {
      query.role = role;
    }

    if (status) {
      query.status = status;
    }

    const result = await db.collection('users')
      .where(query)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const countResult = await db.collection('users').where(query).count();

    const users = result.data.map(user => ({
      userId: user._id,
      openid: user.openid,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      role: user.role,
      status: user.status,
      department: user.department,
      position: user.position,
      createTime: user.createTime,
      lastLoginTime: user.lastLoginTime,
      loginCount: user.loginCount
    }));

    return createSuccessResponse({
      users,
      total: countResult.total,
      page,
      pageSize,
      totalPages: Math.ceil(countResult.total / pageSize)
    });

  } catch (error) {
    return createErrorResponse('获取用户列表失败: ' + error.message);
  }
}

/**
 * 更新用户地区信息（不再保存经纬度）
 */
async function updateUserLocation(event) {
  try {
    const { userId, phoneNumber, region } = event;

    console.log('📍 更新用户地区信息:', { userId, phoneNumber, region });

    if (!phoneNumber) {
      return createErrorResponse('缺少手机号');
    }

    // 查找用户
    const userResult = await db.collection('users').where({
      phone: phoneNumber
    }).get();

    if (userResult.data.length === 0) {
      return createErrorResponse('用户不存在');
    }

    const user = userResult.data[0];

    // 只更新地区信息，不保存经纬度
    await db.collection('users').doc(user._id).update({
      data: {
        region: region,
        updateTime: new Date()
      }
    });

    console.log('✅ 用户地区信息更新成功');

    return createSuccessResponse({
      message: '地区信息更新成功'
    });

  } catch (error) {
    console.error('❌ 更新用户地区失败:', error);
    return createErrorResponse('更新地区信息失败: ' + error.message);
  }
}

//后台图片管理
async function getAvtm(event) {
  try {
    const imgType = event.type;

    console.log('【getAvtm】开始执行，接收参数:', { type: imgType, event: event });

    if (!imgType) {
      console.warn('【getAvtm】缺少图片类型参数');
      return createErrorResponse('缺少图片类型参数');
    }

    // 尝试查询数据库
    try {
      console.log('【getAvtm】开始查询数据库，集合: imgURL, 条件: type=' + imgType);

      const imgList = await db.collection('imgURL').where({
        type: imgType
      }).get();

      console.log('【getAvtm】数据库查询完成，结果数量:', imgList.data.length);
      console.log('【getAvtm】查询结果详情:', JSON.stringify(imgList.data, null, 2));

      if (imgList.data.length == 0) {
        console.warn('【getAvtm】该分类没有图片，type:', imgType);
        // 返回空数组而不是错误，让前端可以处理
        return createSuccessResponse([], '该分类暂无图片');
      }

      // 使用统一的响应格式返回数据
      return createSuccessResponse(imgList.data, '获取图片列表成功');

    } catch (dbError) {
      console.error('【getAvtm】数据库查询失败:', dbError);

      // 检查是否是集合不存在的错误
      if (dbError.message && (
        dbError.message.includes('collection not exists') ||
        dbError.message.includes('ResourceNotFound') ||
        dbError.message.includes('不存在')
      )) {
        console.warn('【getAvtm】数据库集合 imgURL 不存在，返回空数组');
        return createSuccessResponse([], '数据库集合不存在，请先创建 imgURL 集合');
      }

      throw dbError; // 重新抛出其他错误
    }

  } catch (error) {
    console.error('【getAvtm】获取图片列表失败:', error);
    console.error('【getAvtm】错误详情:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return createErrorResponse('获取图片列表失败: ' + (error.message || '未知错误'));
  }
}

/**
 * 逆地理编码
 */
async function reverseGeocode(event) {
  try {
    const { latitude, longitude } = event;

    if (!latitude || !longitude) {
      return createErrorResponse('缺少经纬度参数');
    }

    const options = {
      uri: 'http://api.tianditu.gov.cn/geocoder?postStr={\'lon\':'+longitude+',\'lat\':'+latitude+',\'ver\':1}&type=geocode&tk='+process.env.TIANMAPKEY+'',
      json: true
    };

    const res = await rp(options);

    if (res.status === 0) {
      const result = res.result;
      return createSuccessResponse({
        address: result.formatted_address,
        city: result.addressComponent.city,
        province: result.addressComponent.province,
        district: result.addressComponent.address,
      });
    } else {
      return createErrorResponse('逆地理编码失败: ' + res.message);
    }

  } catch (error) {
    console.error('逆地理编码出错:', error);
    return createErrorResponse('逆地理编码出错: ' + error.message);
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  try {
    const { action } = event;
    console.log('云函数调用，action:', action, 'event:', event);

    switch (action) {
      case 'test':
        return {
          success: true,
          message: '云函数连接正常',
          data: {
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
          }
        };
      case 'updateUserInfo':
        return await updateUserInfo(event);
      case 'getUserInfo':
        return await getUserInfo(event);
      case 'getUserInfo':
        return await getUserInfo(event);
      case 'getUserInfo':
        return await getUserInfo(event);
      case 'userLoginCheck':
        return await userLoginCheck(event);
      case 'changeUserRole':
        return await changeUserRole(event);
      case 'getUserList':
        return await getUserList(event);
      case 'updateUserLocation':
        return await updateUserLocation(event);
      case 'getAvtm':
        return await getAvtm(event);
      case 'phoneNumberLogin':
        return await phoneNumberLogin(event);
      case 'reverseGeocode':
        return await reverseGeocode(event);
      default:
        return createErrorResponse('未知的操作');
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return createErrorResponse('服务器内部错误: ' + error.message);
  }
};