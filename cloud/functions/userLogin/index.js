const cloud = require('wx-server-sdk');
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 手机号登录
 */
const phoneLogin = async (event, wxContext) => {
  const { phone } = event;
  
  if (!phone) {
    return {
      success: false,
      errMsg: '手机号不能为空'
    };
  }

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      success: false,
      errMsg: '手机号格式不正确'
    };
  }

  try {
    const openid = wxContext.OPENID;
    const now = new Date();

    // 查询用户是否存在
    const userResult = await db.collection('users').where({
      phone: phone
    }).get();

    let userId;
    let userData;

    if (userResult.data.length > 0) {
      // 用户已存在，更新登录信息
      const user = userResult.data[0];
      userId = user._id;

      await db.collection('users').doc(userId).update({
        data: {
          openid: openid,
          lastLoginTime: now,
          updateTime: now
        }
      });

      userData = {
        ...user,
        openid: openid,
        lastLoginTime: now,
        updateTime: now
      };
    } else {
      // 用户不存在，创建新用户
      const addResult = await db.collection('users').add({
        data: {
          phone: phone,
          openid: openid,
          loginType: 'phone',
          nickName: `用户${phone.substr(-4)}`,
          avatarUrl: '',
          createTime: now,
          lastLoginTime: now,
          updateTime: now
        }
      });

      userId = addResult._id;

      // 获取新创建的用户信息
      const newUser = await db.collection('users').doc(userId).get();
      userData = newUser.data;
    }

    return {
      success: true,
      data: {
        userId: userId,
        userInfo: userData
      }
    };
  } catch (error) {
    console.error('手机号登录失败:', error);
    return {
      success: false,
      errMsg: '登录失败，请稍后重试'
    };
  }
};

/**
 * 微信授权登录
 */
const wechatLogin = async (event, wxContext) => {
  const { userInfo } = event;
  
  if (!userInfo) {
    return {
      success: false,
      errMsg: '用户信息不能为空'
    };
  }

  try {
    const openid = wxContext.OPENID;
    const unionid = wxContext.UNIONID;
    const now = new Date();

    // 查询用户是否存在（通过 openid）
    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    let userId;
    let userData;

    if (userResult.data.length > 0) {
      // 用户已存在，更新用户信息
      const existingUser = userResult.data[0];
      userId = user._id;

      await db.collection('users').doc(userId).update({
        data: {
          lastLoginTime: new Date(),
          loginCount: _.inc(1)
        }
      });

      userInfo = {
        userId: existingUser._id,
        phoneNumber: existingUser.phone,
        nickname: existingUser.nickname,
        avatarUrl: existingUser.avatar || '',
        role: existingUser.role, // 使用数据库中的角色
        status: existingUser.status || 'active',
        createTime: existingUser.createTime,
        lastLoginTime: new Date(),
        loginCount: (existingUser.loginCount || 0) + 1
      };
    } else {
      // 用户不存在，创建新用户
      const userRole = 'client';
      
      //通过字符串拼接设置用户ID
      const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const addResult = await db.collection('users').add({
        data: {
          userId: newUserId,
          phone: phoneNumber,
          nickname: '用户'+phoneNumber,
          avatarUrl: '',
          role: userRole,
          status: 'active',
          createTime: new Date(),
          lastLoginTime: new Date(),
          loginCount: 1
        }
      });

      userId = addResult._id;

      // 获取新创建的用户信息
      const newUser = await db.collection('users').doc(userId).get();
      userInfo = newUser.data;
    }

    return {
      success: true,
      data: {
        userInfo: userData
      }
    };
  } catch (error) {
    console.error('微信授权登录失败:', error);
    return {
      success: false,
      errMsg: '登录失败，请稍后重试'
    };
  }
};

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
 * 根据手机号获取用户角色
 */
function getUserRoleByPhone(phone) {
  // 超级管理员
  if (phone === '15562406511') {
    return 'admin';
  }
  
  // 维修工手机号
  if (isWorkerPhone(phone)) {
    return 'worker';
  }
  
  // 其他管理员手机号
  if (isAdminPhone(phone)) {
    return 'manager';
  }
  
  // 测试用户（默认为客户）
  if (phone === '15562406512') {
    return 'client';
  }
  
  // 默认为客户
  return 'client';
}

/**
 * 获取用户信息
 */
const getUserInfo = async (event, wxContext) => {
  try {
    const openid = wxContext.OPENID;

    const userResult = await db.collection('users').where({
      openid: openid
    }).get();

    if (userResult.data.length === 0) {
      return {
        success: false,
        errMsg: '用户不存在'
      };
    }

    return {
      success: true,
      data: userResult.data[0]
    };
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return {
      success: false,
      errMsg: '获取用户信息失败'
    };
  }
};

/**
 * 步骤2: 通过code获取openid
 * 注意: 在云函数中，可以直接使用wxwxContext获取openid，不需要调用微信接口
 */
const getOpenId = async (event, wxContext) => {
  try {
    const openid = wxContext.OPENID;
    
    if (!openid) {
      return {
        success: false,
        errMsg: '获取openid失败'
      };
    }

    console.log('步骤2: 成功获取openid:', openid);
    
    return {
      success: true,
      data: {
        openid: openid
      }
    };
  } catch (error) {
    console.error('获取openid失败:', error);
    return {
      success: false,
      errMsg: '获取openid失败: ' + error.message
    };
  }
};

/**
 * 步骤4: 通过phoneCode获取用户手机号并完成登录
 */
const getPhoneNumber = async (event, wxContext) => {
  const code = event.code;
  const openid = event.openid

  if (!code) {
    return {
      success: false,
      errMsg: 'phoneCode不能为空'
    };
  }

  try {
    console.log('步骤4: 开始获取手机号, phoneCode:', code);
    
    // 调用微信接口获取手机号
    const result = await cloud.openapi.phonenumber.getPhoneNumber({
      code: code,
      openid: openid
    });

    console.log('微信接口返回:', result);

    if (result.errCode !== 0) {
      return {
        success: false,
        errMsg: '获取手机号失败a: ' + (result.errMsg || '未知错误')
      };
    }

    const phoneNumber = result.phoneInfo.phoneNumber;
    console.log('成功获取手机号:', phoneNumber);

    const userQuery = await db.collection('users').where({
      phone: phoneNumber
    }).get();

    let userInfo;

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
      // 用户不存在，创建新用户
      // const userRole = getUserRoleByPhone(phoneNumber);
      // console.log('新用户注册，使用硬编码角色:', userRole);
      
      const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      userInfo = {
        userId: newUserId,
        phone: phoneNumber,
        nickname: '用户'+phoneNumber,
        avatarUrl: '',
        role: 'client',
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
            phone: phoneNumber,
            nickname: userInfo.nickname,
            avatar: '',
            role: 'client',
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

    // console.log('步骤5: 登录完成，用户ID:', userId);

    return {
      success: true,
      data: {
        userInfo: userInfo,
      }
    };
  } catch (error) {
    return {
      success: false,
      errMsg: '获取手机号失败b: ' + error.message
    };
  }
};

/**
 * 云函数入口函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  switch (event.type) {
    case 'getOpenId':
      // 步骤2: 获取openid
      return await getOpenId(event, wxContext);
    case 'getPhoneNumber':
      // 步骤4: 获取手机号并完成登录
      return await getPhoneNumber(event, wxContext);
    case 'phoneLogin':
      return await phoneLogin(event, wxContext);
    case 'wechatLogin':
      return await wechatLogin(event, wxContext);
    case 'getUserInfo':
      return await getUserInfo(event, wxContext);
    default:
      return {
        success: false,
        errMsg: '未知的操作类型'
      };
  }
};

