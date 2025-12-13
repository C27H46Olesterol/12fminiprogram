// cloud/functions/manager-overview/index.js
// 主管页面概览数据云函数

const cloud = require('wx-server-sdk');

// 初始化云开发环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database();
const _ = db.command;

/**
 * 通用响应格式
 */
function createSuccessResponse(data = null, message = 'success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().getTime()
  };
}

function createErrorResponse(message = 'error') {
  return {
    success: false,
    message,
    data: null,
    timestamp: new Date().getTime()
  };
}

/**
 * 验证用户权限（简化版）
 */
function validateManagerPermission(phoneNumber) {
  if (!phoneNumber) {
    throw new Error('用户未登录');
  }

  // 主管和管理员手机号列表
  const managerPhones = [
    '15562406511', // 超级管理员
    '13800138000', // 测试管理层1
    // '13900139000', // 已改为测试维修工
    '13700137000', // 测试管理层2
    '15600000000'  // 通用测试管理
  ];

  // 超级管理员
  if (phoneNumber === '15562406511') {
    return { role: 'admin', name: '超级管理员' };
  }

  // 其他管理层
  if (managerPhones.includes(phoneNumber)) {
    return { role: 'manager', name: '主管' };
  }

  throw new Error('权限不足，只有主管和管理员可以访问');
}

/**
 * 确保数据库集合存在
 */
async function ensureCollectionsExist() {
  console.log('🔍 检查数据库集合...');
  
  const collections = [
    {
      name: 'issues',
      initDoc: {
        issueId: 'INIT_' + Date.now(),
        title: '系统初始化',
        description: '数据库集合初始化记录',
        category: '系统',
        priority: 'low',
        status: 'resolved',
        clientId: 'system',
        clientName: '系统管理员',
        clientPhone: '00000000000',
        contactPhone: '00000000000',
        createTime: new Date(),
        updateTime: new Date(),
        estimateTime: 0,
        actualTime: 0
      }
    },
    {
      name: 'users',
      initDoc: {
        _openid: 'system_init',
        role: 'admin',
        nickname: '系统管理员',
        phone: '00000000000',
        createTime: new Date(),
        updateTime: new Date()
      }
    },
    {
      name: 'issueStatusHistory',
      initDoc: {
        issueId: 'INIT_' + Date.now(),
        status: 'created',
        operatorId: 'system',
        operatorName: '系统管理员',
        remark: '初始化历史记录',
        timestamp: new Date()
      }
    },
    {
      name: 'technicians',
      initDoc: {
        name: '系统管理员',
        phone: '00000000000',
        specialties: ['系统'],
        status: 'active',
        createTime: new Date(),
        updateTime: new Date()
      }
    }
  ];

  for (const collection of collections) {
    try {
      // 尝试查询集合
      await db.collection(collection.name).limit(1).get();
      console.log(`✅ ${collection.name} 已存在`);
    } catch (error) {
      if (error.errCode === -502005) {
        console.log(`❌ ${collection.name} 不存在，需要手动创建`);
        console.log(`💡 请在云开发控制台手动创建 ${collection.name} 集合`);
        // 不尝试创建集合，因为微信云开发不允许
        // 继续执行，让后续代码处理集合不存在的情况
      } else {
        console.log(`❌ 检查 ${collection.name} 集合时出错:`, error.message);
      }
    }
  }
}

/**
 * 获取主管页面概览数据
 */
async function getManagerOverview(event) {
  try {
    console.log('🚀 开始获取主管概览数据...');
    
    // 获取手机号
    const phoneNumber = event.phoneNumber || event.userInfo?.phoneNumber;
    console.log('📱 用户手机号:', phoneNumber);
    
    // 验证用户权限（主管和管理员）
    const user = validateManagerPermission(phoneNumber);
    console.log('👤 用户信息:', user.name, '角色:', user.role);

    // 确保数据库集合存在
    console.log('🔍 检查数据库集合...');
    await ensureCollectionsExist();

    // 先测试数据库连接
    console.log('🗄️ 测试数据库连接...');
    try {
      const testQuery = await db.collection('issues').limit(1).get();
      console.log('✅ 数据库连接正常，issues集合存在');
    } catch (dbError) {
      console.log('❌ 数据库连接失败:', dbError);
      if (dbError.errCode === -502005) {
        console.log('🔧 尝试创建issues集合...');
        try {
          await db.collection('issues').add({
            data: {
              issueId: 'TEST_' + Date.now(),
              title: '测试问题',
              description: '数据库连接测试',
              status: 'pending',
              createTime: new Date()
            }
          });
          console.log('✅ issues集合创建成功');
        } catch (createError) {
          console.log('❌ issues集合创建失败:', createError);
          return createErrorResponse('数据库集合创建失败: ' + createError.message);
        }
      } else {
        return createErrorResponse('数据库连接失败: ' + dbError.message);
      }
    }

    // 查询统计数据
    console.log('📊 查询统计数据...');
    let pendingCount = 0, assignedCount = 0, processingCount = 0, resolvedCount = 0, pendingRatingsCount = 0;
    
    try {
      const pendingResult = await db.collection('issues').where({ status: 'pending' }).count();
      pendingCount = pendingResult.total;
      console.log('✅ 待处理问题数量:', pendingCount);
    } catch (error) {
      console.log('⚠️ 查询待处理问题失败:', error.message);
    }
    
    try {
      const assignedResult = await db.collection('issues').where({ status: 'assigned' }).count();
      assignedCount = assignedResult.total;
      console.log('✅ 已分配问题数量:', assignedCount);
    } catch (error) {
      console.log('⚠️ 查询已分配问题失败:', error.message);
    }
    
    try {
      const processingResult = await db.collection('issues').where({ status: 'processing' }).count();
      processingCount = processingResult.total;
      console.log('✅ 处理中问题数量:', processingCount);
    } catch (error) {
      console.log('⚠️ 查询处理中问题失败:', error.message);
    }
    
    try {
      const resolvedResult = await db.collection('issues').where({ status: 'resolved' }).count();
      resolvedCount = resolvedResult.total;
      console.log('✅ 已解决问题数量:', resolvedCount);
    } catch (error) {
      console.log('⚠️ 查询已解决问题失败:', error.message);
    }

    // 查询待评价工单数量（主管端：已解决但主管未评价的工单）
    try {
      const pendingRatingsResult = await db.collection('issues')
        .where({
          status: 'resolved',  // 只查询已解决的工单
          managerSatisfaction: _.exists(false)  // managerSatisfaction 字段不存在
        })
        .count();
      pendingRatingsCount = pendingRatingsResult.total;
      console.log('✅ 待评价工单数量:', pendingRatingsCount);
    } catch (error) {
      console.log('⚠️ 查询待评价工单失败:', error.message);
      pendingRatingsCount = 0;
    }

    // 获取问题列表
    console.log('📋 获取问题列表...');
    let urgentIssues = [], recentIssues = [];
    
    try {
      const urgentQuery = await db.collection('issues')
        .where({
          status: 'pending',
          priority: _.in(['high', 'urgent'])
        })
        .orderBy('createTime', 'desc')
        .limit(5)
        .get();
      
      urgentIssues = urgentQuery.data.map(issue => ({
        id: issue.issueId || issue._id,
        title: issue.title,
        description: issue.description,
        createTime: formatTime(issue.createTime),
        priority: issue.priority,
        category: issue.category
      }));
      console.log('✅ 紧急问题数量:', urgentIssues.length);
    } catch (error) {
      console.log('⚠️ 查询紧急问题失败:', error.message);
      urgentIssues = []; // 确保返回空数组而不是undefined
    }
    
    try {
      const recentQuery = await db.collection('issues')
        .where({
          status: _.in(['assigned', 'processing', 'resolved'])
        })
        .orderBy('updateTime', 'desc')
        .limit(5)
        .get();
      
      recentIssues = recentQuery.data.map(issue => ({
        id: issue.issueId || issue._id,
        title: issue.title,
        status: issue.status,
        statusText: getStatusText(issue.status),
        assignee: issue.assignedWorkerName || '未分配',
        updateTime: formatTime(issue.updateTime),
        priority: issue.priority,
        category: issue.category
      }));
      console.log('✅ 最近问题数量:', recentIssues.length);
    } catch (error) {
      console.log('⚠️ 查询最近问题失败:', error.message);
      recentIssues = []; // 确保返回空数组而不是undefined
    }

    const overviewData = {
      pending: pendingCount,
      assigned: assignedCount,
      processing: processingCount,
      resolved: resolvedCount,
      pendingRatings: pendingRatingsCount,  // 添加待评价工单数量
      total: pendingCount + assignedCount + processingCount + resolvedCount
    };

    console.log('✅ 概览数据获取成功:', overviewData);

    return createSuccessResponse({
      overview: overviewData,
      urgentIssues: urgentIssues,
      recentIssues: recentIssues
    });

  } catch (error) {
    console.error('❌ 获取主管概览数据失败:', error);
    return createErrorResponse('获取数据失败: ' + error.message);
  }
}

/**
 * 格式化时间
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const statusMap = {
    pending: '待处理',
    assigned: '已分配',
    processing: '处理中',
    parts_sent: '配件已发出',
    parts_received: '返件已收到',
    resolved: '已解决',
    closed: '已关闭',
    cancelled: '已取消'
  };
  
  return statusMap[status] || '未知';
}

/**
 * 初始化数据库集合
 */
async function initDatabase(event) {
  try {
    console.log('🚀 开始初始化数据库集合...');
    await ensureCollectionsExist();
    return createSuccessResponse(null, '数据库初始化成功');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    return createErrorResponse('数据库初始化失败: ' + error.message);
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  console.log('🚀 云函数 manager-overview 被调用');
  console.log('📊 事件数据:', event);
  
  switch (event.action) {
    case 'getOverview':
      return await getManagerOverview(event);
    case 'initDatabase':
      return await initDatabase(event);
    default:
      return createErrorResponse('未知操作: ' + event.action);
  }
};
