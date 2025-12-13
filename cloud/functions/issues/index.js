// cloud/functions/issues/index.js - 工单管理云函数
// 版本: v2.0.1 - 修复主管查看权限问题

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 角色配置映射 - 定义每个角色的职位和权限
const ROLE_CONFIG = {
  client: {
    position: '客户',
    permissions: ['view_own_issues', 'create_issue', 'update_own_issue', 'view_faq']
  },
  worker: {
    position: '维修工',
    permissions: ['view_assigned_issues', 'update_assigned_issue', 'view_faq', 'upload_file']
  },
  manager: {
    position: '经理',
    permissions: ['view_all_issues', 'create_issue', 'update_issue', 'assign_issue', 'view_statistics', 'view_faq', 'manage_faq', 'upload_file']
  },
  admin: {
    position: '超级管理员',
    permissions: ['*'] // 拥有所有权限
  }
};

// 检查和创建必要集合的函数
async function ensureCollectionsExist() {
  console.log('正在检查数据库集合...');
  
  const collections = ['issues', 'users', 'issueStatusHistory'];
  
  for (const collectionName of collections) {
    try {
      console.log(`检查集合 ${collectionName}...`);
      
      // 尝试查询集合
      const result = await db.collection(collectionName).limit(1).get();
      console.log(`集合 ${collectionName} 已存在，文档数量:`, result.data.length);
      
    } catch (error) {
      console.log(`集合 ${collectionName} 检查失败:`, error.message);
      
      if (error.message.includes('collection not exists') || error.message.includes('ResourceNotFound')) {
        console.log(`尝试创建集合 ${collectionName}...`);
        
        try {
          // 根据集合类型创建不同的初始化文档
          let initDoc = {};
          
          switch (collectionName) {
            case 'issues':
              initDoc = {
                _id: 'init',
                issueId: 'INIT_' + Date.now(),
                title: '系统初始化',
                description: '数据库集合初始化记录',
                category: '系统',
                priority: 'low',
                status: 'resolved',
                clientId: 'system',
                clientName: '系统管理员',
                createTime: new Date(),
                updateTime: new Date(),
                estimateTime: 0,
                actualTime: 0
              };
              break;
              
            case 'users':
              initDoc = {
                _id: 'init_user',
                _openid: 'system_init',
                role: 'admin',
                nickname: '系统管理员',
                phone: '00000000000',
                createTime: new Date(),
                updateTime: new Date()
              };
              break;
              
            case 'issueStatusHistory':
              initDoc = {
                _id: 'init_history',
                issueId: 'INIT_' + Date.now(),
                status: 'created',
                operatorId: 'system',
                operatorName: '系统管理员',
                remark: '初始化历史记录',
                timestamp: new Date()
              };
              break;
          }
          
          const createResult = await db.collection(collectionName).add({
            data: initDoc
          });
          
          console.log(`集合 ${collectionName} 创建成功，文档ID:`, createResult._id);
          
        } catch (createError) {
            console.error(`创建集合 ${collectionName} 失败:`, createError);
            throw new Error(`数据库初始化失败: ${collectionName} 集合创建失败 - ${createError.message}`);
        }
      } else {
        // 其他类型的错误
        console.error(`集合 ${collectionName} 检查出现未知错误:`, error);
        throw new Error(`数据库错误: ${collectionName} 集合检查失败 - ${error.message}`);
      }
    }
  }
  
  console.log('数据库集合检查完成');
}

// 工具函数
function createSuccessResponse(data = null, message = '操作成功') {
  return {
    success: true,
    data,
    message
  };
}

function createErrorResponse(message) {
  return {
    success: false,
    message
  };
}

function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * 生成工单编号（新格式：前缀-日期-流水号）
 * @param {string} userRole - 用户角色（client/user表示客户C，manager/admin表示主管M）
 * @param {string} dateString - 日期字符串，格式：YYMMDD（如：251029）
 * @param {number} sequenceNumber - 流水号（如：1, 2, 3...）
 * @returns {string} 工单编号（如：C-251029-001 或 M-251029-001）
 */
function generateIssueNumber(userRole, dateString, sequenceNumber) {
  // 根据角色确定前缀
  const prefix = (userRole === 'manager' || userRole === 'admin') ? 'M' : 'C';
  
  // 格式化流水号为三位数
  const seq = String(sequenceNumber).padStart(3, '0');
  
  return `${prefix}-${dateString}-${seq}`;
}

/**
 * 获取当天的工单流水号
 * @param {string} userRole - 用户角色
 * @returns {Promise<{dateString: string, sequenceNumber: number, issueNumber: string}>}
 */
async function getNextIssueNumber(userRole) {
  // 获取当前日期，格式化为 YYMMDD
  const now = new Date();
  const year = String(now.getFullYear()).slice(2); // 25
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 10
  const day = String(now.getDate()).padStart(2, '0'); // 29
  const dateString = year + month + day; // 251029
  
  // 根据角色确定前缀
  const prefix = (userRole === 'manager' || userRole === 'admin') ? 'M' : 'C';
  
  try {
    // 查询当天该前缀的所有工单
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    
    const result = await db.collection('issues')
      .where({
        createTime: _.gte(startOfDay).and(_.lte(endOfDay))
      })
      .field({
        issueId: true
      })
      .get();
    
    // 过滤出相同前缀的工单
    const todayIssues = result.data.filter(issue => {
      return issue.issueId && issue.issueId.startsWith(`${prefix}-${dateString}-`);
    });
    
    // 计算下一个流水号
    const sequenceNumber = todayIssues.length + 1;
    
    // 生成工单编号
    const issueNumber = generateIssueNumber(userRole, dateString, sequenceNumber);
    
    return {
      dateString,
      sequenceNumber,
      issueNumber
    };
  } catch (error) {
    console.error('获取工单流水号失败:', error);
    // 如果查询失败，使用默认流水号 1
    return {
      dateString,
      sequenceNumber: 1,
      issueNumber: generateIssueNumber(userRole, dateString, 1)
    };
  }
}

/**
 * 通过 taskId 查询任务（支持 issueId 或 _id）
 * @param {string} taskId - 任务ID（可能是 issueId 或 _id）
 * @returns {Promise<Object>} - 返回任务数据和真实的 _id
 */
async function getTaskByIdOrIssueId(taskId) {
  try {
    // 先尝试使用 issueId 查询
    const queryResult = await db.collection('issues').where({
      issueId: taskId
    }).get();
    
    if (queryResult.data && queryResult.data.length > 0) {
      const taskData = queryResult.data[0];
      console.log('📊 通过 issueId 查询到任务，_id:', taskData._id);
      return {
        data: taskData,
        realId: taskData._id
      };
    }
    
    // 如果 issueId 查询失败，尝试使用 _id 查询
    console.log('⚠️ issueId 查询失败，尝试使用 _id 查询');
    const docResult = await db.collection('issues').doc(taskId).get();
    
    if (docResult.data) {
      console.log('📊 通过 _id 查询到任务');
      return {
        data: docResult.data,
        realId: taskId
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ 查询任务失败:', error);
    throw error;
  }
}

async function validateUserPermission(event, allowedRoles = []) {
  console.log('开始用户权限验证，允许的角色:', allowedRoles);
  
  try {
    // 【改造】优先使用手机号查询用户（兼容多种参数名）
    const {userId,clientPhone} = event;
    const resolvedPhone = clientPhone;
    let userResult;
    console.log('前端事件',event);
    console.log('服务端获取的手机号',resolvedPhone);
    // 方案1: 优先通过手机号查找（最直接）
    if (resolvedPhone) {
      console.log('通过手机号查询用户:', resolvedPhone);
      userResult = await db.collection('users').where({
        phone: resolvedPhone.trim(),
        status: 'active'
      }).get();
      console.log('✅ 通过手机号找到用户记录数:', userResult.data.length);
      if (userResult.data.length > 0) {
        console.log('✅ 通过手机号找到用户记录数:', userResult.data.length);
        
        // 打印所有找到的用户
        console.log('📋 找到的所有用户记录:');
        userResult.data.forEach((u, idx) => {
          console.log(`  [${idx}] ${u.nickname} (${u.role}) - ID: ${u._id}`);
        });

        // 若同手机号存在多条，优先非客户角色，再根据角色优先级选择
        // admin(4) > manager(3) > worker(2) > user(1) > client(0)
        const rolePriority = { admin: 4, manager: 3, worker: 2, user: 1, client: 0 };
        const sorted = userResult.data
          .slice()
          .sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0));
        
        console.log('📋 排序后的用户记录:');
        sorted.forEach((u, idx) => {
          console.log(`  [${idx}] ${u.nickname} (${u.role}, 优先级: ${rolePriority[u.role] || 0}) - ID: ${u._id}`);
        });
        
        const user = sorted[0];
        console.log('✅ 最终选定用户:', user.phone, user.nickname, '角色:', user.role);

        // 检查角色权限
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          console.log('权限不足，用户角色:', user.role, '需要角色:', allowedRoles);
          throw new Error('权限不足','需要角色:', allowedRoles);
        }

        console.log('用户权限验证通过');
        return user;
      }else{
        console.log('根据手机号未查到信息')
      }
    }
    
    // 方案2: 通过用户ID查找
    if (userId) {
      console.log('通过用户ID查询:', userId);
      const userDoc = await db.collection('users').doc(userId).get();
      
      if (userDoc.data) {
        console.log('✅ 通过用户ID找到用户');
        const user = userDoc.data;
        console.log('找到用户:', user.phone, user.nickname, '角色:', user.role);
        
        // 检查角色权限
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          console.log('权限不足，用户角色:', user.role, '需要角色:', allowedRoles);
          throw new Error('权限不足');
        }
        
        console.log('用户权限验证通过');
        return user;
      }
    }
    
    // 方案3: 备用方案 - 通过 OpenID 查找（兼容旧数据）
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;
    
    if (openid && openid !== 'undefined') {
      console.log('备用方案：通过 OpenID 查询:', openid);
      userResult = await db.collection('users').where({
        openid: openid
      }).get();
      
      if (userResult.data.length > 0) {
        console.log('✅ 通过 OpenID 找到用户');
        const user = userResult.data[0];
        console.log('找到用户:', user.phone, user.nickname, '角色:', user.role);
        
        // 检查角色权限
        if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
          console.log('权限不足，用户角色:', user.role, '需要角色:', allowedRoles);
          throw new Error('权限不足');
        }
        
        console.log('用户权限验证通过');
        return user;
      }
    }
    
    // 如果所有方式都找不到用户
    console.log('❌ 用户未注册，无法提交工单');
    console.log('传入参数 - phone:', resolvedPhone, 'userId:', userId, 'openid:', openid);
    throw new Error('用户未注册，请先在"我的"页面完成注册')
    
  } catch (error) {
    console.log('用户验证过程出错:', error.message);
    
    if (error.message.includes('collection not exists') || error.message.includes('ResourceNotFound')) {
      console.log('检测到集合不存在');
      throw new Error('数据库未初始化，请联系管理员');
    }
    throw error;
  }
}

async function paginateQuery(collection, query, options = {}) {
  const { page = 1, pageSize = 20, orderBy = 'createTime', order = 'desc' } = options;
  
  // 获取总数
  const countResult = await collection.where(query).count();
  const total = countResult.total;
  
  // 获取数据
  let dataResult;
  if (order === 'desc') {
    dataResult = await collection.where(query).orderBy(orderBy, 'desc').skip((page - 1) * pageSize).limit(pageSize).get();
  } else {
    dataResult = await collection.where(query).orderBy(orderBy, 'asc').skip((page - 1) * pageSize).limit(pageSize).get();
  }
  
  // 返回包含总数的结果
  return {
    data: dataResult.data,
    total: total,
    page: page,
    pageSize: pageSize,
    errMsg: dataResult.errMsg
  };
}

async function sendNotification(userId, title, content, type, data) {
  try {
    await db.collection('notifications').add({
      data: {
        _id: generateId('notif_'),
        userId,
        title,
        content,
        type,
        data,
        isRead: false,
        createTime: new Date()
      }
    });
  } catch (error) {
    console.log('发送通知失败（集合可能不存在）:', error.message);
    // 通知失败不影响主流程
  }
}

async function sendBatchNotifications(userIds, title, content, type, data) {
  const notifications = userIds.map(userId => ({
    _id: generateId('notif_'),
    userId,
    title,
    content,
    type,
    data,
    isRead: false,
    createTime: new Date()
  }));
  
  try {
    await db.collection('notifications').add({
      data: notifications
    });
  } catch (error) {
    console.log('批量发送通知失败（集合可能不存在）:', error.message);
    // 通知失败不影响主流程
  }
}

/**
 * 提交反馈（客户功能）
 */
async function submitFeedback(event) {
  try {
    console.log('收到submitFeedback请求:', JSON.stringify(event, null, 2));
    
    console.log('开始执行业务逻辑...');
    
    // console.log('开始验证用户权限...');
    const user = await validateUserPermission(event, ['client', 'manager', 'admin']);
    // console.log('用户权限验证完成，用户信息:', JSON.stringify(user, null, 2));
    
    const {
      description,
      priority,
      productCode,
      clientPhone,
      clientId,
      clientName,
      clientAddress,
      images = [],
      faultTypes = [],
    } = event;

    console.log('接收到的事件参数:', JSON.stringify(event, null, 2));

    // 详细验证 - 确保字段存在避免 undefined.trim() 错误
    const clientPhoneStr = clientPhone || '';

    // 必填项验证：只验证手机号（前端通过图片作为必填项）
    if (!clientPhoneStr || clientPhoneStr.trim() === '') {
      return createErrorResponse('联系电话不能为空');
    }
    if (!/^1[3-9]\d{9}$/.test(clientPhoneStr.trim())) {
      return createErrorResponse('请输入正确的手机号码');
    }

    // 生成工单编号（新格式：前缀-日期-流水号）
    const issueNumberInfo = await getNextIssueNumber(user.role);
    const issueId = issueNumberInfo.issueNumber;
    const userId = user._id;
    
    console.log('生成的工单编号:', issueId, '角色:', user.role);

    // 工单数据结构说明：
    // clientPhone/clientAddress/clientName: 提交工单的用户（登录用户）的信息（显示在详情页）
    // contactPhoneData/contactNameData/installAddressData: 需要维修的联系人信息（表单填写，也显示在详情页）
    // reporterName/reporterPhone: 报告人信息（提交工单的用户信息，用于列表显示）
    
    // 使用合理的默认值，避免 undefined.trim() 错误
    const finalDescription = (description && typeof description === 'string') ? description.trim() || '无' : '无';
    console.log(finalDescription)
    
    // 安全处理可能为 undefined 的字段
    const finalClientName = (clientName && typeof clientName === 'string') ? clientName.trim() : '';
    const finalClientAddress = (clientAddress && typeof clientAddress === 'string') ? clientAddress.trim() : '';
    
    const issueData = {
      _id: generateId('issue_'),
      issueId,
      // description: description,
      description: finalDescription,
      priority,
      status: 'pending',
      clientId: clientId,
      clientName: finalClientName || user.nickname,  // 优先使用表单填写的联系人姓名
      productCode,
      // clientPhone: clientPhone,  // 优先使用表单填写的联系电话
      // clientAddress: clientAddres,  // 优先使用表单填写的安装地址
      // clientAddress: finalclientAddres,  // 优先使用表单填写的安装地址
      // productModelData: productCode,
      nowclientAddres: finalClientAddress,  // 需要维修的地址（表单填写）
      reporterName: user.nickname,  // 报告人姓名（提交工单的用户）
      reporterPhone: user.phone,  // 报告人电话（提交工单的用户）
      assignedWorkerId: '',
      assignedWorkerName: '',
      assignedTime: null,
      processingTime: null,
      resolvedTime: null,
      closedTime: null,
      attachments: event.attachments || [],
      images,
      faultTypes,
      processingRecords: [],
      resultDescription: '',
      satisfaction: 0,
      feedback: '',
      createTime: new Date(),
      updateTime: new Date(),
      estimatedTime: 0,
      actualTime: 0
    };
    console.log("手动断点")
    // 创建工单
    try {
      console.log('准备创建工单，数据:', JSON.stringify(issueData, null, 2));
      const result = await db.collection('issues').add({
        data: issueData
      });
      console.log('工单创建成功，ID:', result._id);
    } catch (error) {
      console.log('创建工单失败，错误详情:', error);
      console.log('错误消息:', error.message);
      console.log('错误代码:', error.code);
      console.log('错误详情:', error.details);
      throw new Error('数据库错误，请联系管理员: ' + error.message);
    }

    // 记录状态历史 - 暂时跳过以避免集合创建问题
    console.log('跳过状态历史记录，避免集合创建问题');

    // 通知所有主管（如果集合存在）
    try {
      const managers = await db.collection('users').where({
        role: 'manager',
        status: 'active'
      }).get();

      if (managers.data.length > 0) {
        const managerIds = managers.data.map(m => m._id);
        await sendBatchNotifications(
          managerIds,
          '新问题反馈',
          `客户 ${user.nickname} 提交了新的问题反馈：${finalDescription}`,
          'issue',
          issueData._id
        );
      }
    } catch (error) {
      console.log('通知主管失败:', error.message);
      // 通知失败不阻止工单创建
    }

    return createSuccessResponse({
      issueId: issueData._id,
      issueNumber: issueId
    }, '问题反馈提交成功');

  } catch (error) {
    return createErrorResponse('提交失败: ' + error.message);
  }
}

/**
 * 获取待处理问题列表（主管功能）
 */
async function getPendingIssues(event) {
  try {
    console.log('getPendingIssues - 开始获取待处理问题');
    
    // 验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    let managerUser = user;
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          managerUser = managerResult.data[0];
          console.log('找到对应的主管账号:', managerUser.nickname);
        } else {
          console.log('未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }
    
    const { page = 1, pageSize = 20, category = '', priority = '' } = event;

    let query = { status: 'pending' };
    
    if (category) {
      query.category = category;
    }
    
    if (priority) {
      query.priority = priority;
    }

    console.log('查询条件:', JSON.stringify(query, null, 2));

    const result = await paginateQuery(
      db.collection('issues'),
      query,
      { page, pageSize, orderBy: 'createTime', order: 'desc' }
    );
    
    console.log('查询结果:', result.data.length, '条记录, 总数:', result.total);

    // 为旧数据补充 reporterName 和 reporterPhone
    const issuesWithReporter = await Promise.all(result.data.map(async (issue) => {
      // 如果已经有 reporterName 和 reporterPhone，直接返回
      if (issue.reporterName && issue.reporterPhone) {
        return issue;
      }
      
      // 否则，通过 clientId 查询用户信息
      try {
        const userDoc = await db.collection('users').doc(issue.clientId).get();
        if (userDoc.data) {
          return {
            ...issue,
            reporterName: userDoc.data.nickname || '未知用户',
            reporterPhone: userDoc.data.phone || ''
          };
        }
      } catch (error) {
        console.error('查询报告人信息失败:', error);
      }
      
      // 如果查询失败，返回默认值
      return {
        ...issue,
        reporterName: '未知用户',
        reporterPhone: ''
      };
    }));

    return createSuccessResponse({
      ...result,
      data: issuesWithReporter
    });

  } catch (error) {
    console.error('getPendingIssues错误:', error);
    return createErrorResponse('获取待处理问题失败: ' + error.message);
  }
}

/**
 * 获取已分配问题列表（主管功能）
 */
async function getAssignedIssues(event) {
  try {
    console.log('getAssignedIssues - 开始获取已分配问题');
    
    // 验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    let managerUser = user;
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          managerUser = managerResult.data[0];
          console.log('找到对应的主管账号:', managerUser.nickname);
        } else {
          console.log('未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }
    
    const { page = 1, pageSize = 20, workerId = '', selectedStatus = '' } = event;

    // 如果有指定状态，只查询该状态；否则查询所有已分配相关状态
    let query;
    if (selectedStatus) {
      // 特殊处理：processing 状态只包含 assigned 和 processing，不包括配件流程状态
      if (selectedStatus === 'processing') {
        query = { status: _.in(['assigned', 'processing']) };
      } else {
        query = { status: selectedStatus };
      }
    } else {
      query = { status: _.in(['assigned', 'processing', 'parts_request', 'parts_sent', 'parts_return_approval', 'parts_received']) };
    }
    
    if (workerId) {
      query.assignedWorkerId = workerId;
    }

    console.log('查询条件:', JSON.stringify(query, null, 2));

    const result = await paginateQuery(
      db.collection('issues'),
      query,
      { page, pageSize, orderBy: 'assignedTime', order: 'desc' }
    );
    
    console.log('查询结果:', result.data.length, '条记录, 总数:', result.total);

    // 填充维修工手机号
    const issuesWithPhone = await Promise.all(result.data.map(async (issue) => {
      if (issue.assignedWorkerId) {
        try {
          const workerResult = await db.collection('users').doc(issue.assignedWorkerId).get();
          if (workerResult.data) {
            issue.assignedWorkerPhone = workerResult.data.phone;
          }
        } catch (error) {
          console.error('获取维修工手机号失败:', error);
        }
      }
      return issue;
    }));
    
    result.data = issuesWithPhone;

    return createSuccessResponse(result);

  } catch (error) {
    console.error('getAssignedIssues错误:', error);
    return createErrorResponse('获取已分配问题失败: ' + error.message);
  }
}

/**
 * 获取已解决问题列表（主管功能）
 */
async function getResolvedIssues(event) {
  try {
    console.log('getResolvedIssues - 开始获取已解决问题');
    
    // 验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    let managerUser = user;
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          managerUser = managerResult.data[0];
          console.log('找到对应的主管账号:', managerUser.nickname);
        } else {
          console.log('未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }
    
    const { page = 1, pageSize = 20, workerId = '', startDate = '', endDate = '' } = event;

    let query = { status: 'resolved' };
    
    if (workerId) {
      query.assignedWorkerId = workerId;
    }

    if (startDate && endDate) {
      query.resolvedTime = _.gte(new Date(startDate)).and(_.lte(new Date(endDate)));
    }

    console.log('查询条件:', JSON.stringify(query, null, 2));

    const result = await paginateQuery(
      db.collection('issues'),
      query,
      { page, pageSize, orderBy: 'resolvedTime', order: 'desc' }
    );
    
    console.log('查询结果:', result.data.length, '条记录, 总数:', result.total);

    return createSuccessResponse(result);

  } catch (error) {
    console.error('getResolvedIssues错误:', error);
    return createErrorResponse('获取已解决问题失败: ' + error.message);
  }
}

/**
 * 获取问题详情
 */
async function getIssueDetail(event) {
  try {
    console.log('🚀 ========== getIssueDetail 开始 ==========');
    console.log('📋 接收到的参数:', JSON.stringify(event, null, 2));
    
    const user = await validateUserPermission(event);
    
    console.log('👤 validateUserPermission 返回的用户信息:', {
      _id: user._id,
      nickname: user.nickname,
      phone: user.phone,
      role: user.role,
      position: user.position
    });
    
    const { issueId } = event;

    console.log('📌 getIssueDetail - 接收到的 issueId:', issueId);
    console.log('📌 issueId 类型:', typeof issueId);

    if (!issueId) {
      return createErrorResponse('缺少问题ID');
    }

    let issueResult = { data: null };
    
    // 判断 ID 类型并选择查询方式
    const isFormattedId = issueId.startsWith('M-') || issueId.startsWith('ISSUE_') || issueId.startsWith('C-'); // 格式化的 issueId
    console.log('✅ 通过issueId字段查询:', isFormattedId);

    // 优先通过issueId字段查询（因为前端传递的是issueId值）
    if (isFormattedId) {
      console.log('✅ 通过issueId字段查询:', issueId);
      const queryResult = await db.collection('issues')
        .where({ issueId: issueId })
        .get();
      
      console.log('查询结果:', queryResult.data.length, '条');
      if (queryResult.data && queryResult.data.length > 0) {
        issueResult.data = queryResult.data[0];
        console.log('✅ 通过issueId字段查询成功');
      } else {
        console.log('❌ issueId字段查询失败，未找到匹配记录');
      }
    }
    
    // 如果issueId查询失败，尝试通过直接文档ID查询
    if (!issueResult.data) {
      console.log('🔍 尝试通过文档ID直接查询:', issueId);
      try {
        issueResult = await db.collection('issues').doc(issueId).get();
        if (issueResult.data) {
          console.log('✅ 通过文档ID查询成功');
        } else {
          console.log('❌ 文档ID查询返回空数据');
        }
      } catch (docError) {
        console.log('❌ 文档ID查询失败:', docError.message);
      }
    }
    
    // 最后尝试通过_id字段查询
    if (!issueResult.data) {
      console.log('🔍 尝试通过_id字段查询:', issueId);
      const queryResult = await db.collection('issues')
        .where({ _id: issueId })
        .get();
      
      console.log('查询结果:', queryResult.data.length, '条');
      if (queryResult.data && queryResult.data.length > 0) {
        issueResult.data = queryResult.data[0];
        console.log('✅ 通过_id字段查询成功');
      } else {
        console.log('❌ _id字段查询失败，未找到匹配记录');
      }
    }

    if (!issueResult.data) {
      console.log('❌ 所有查询方式都失败了，issueId:', issueId);
      return createErrorResponse('问题不存在');
   }

    const issue = issueResult.data;

    console.log('🔍 权限检查 - 用户信息:', {
      userId: user._id,
      userRole: user.role,
      userName: user.name,
      issueClientId: issue.clientId
    });

    // 检查权限：客户只能查看自己的问题，主管、维修工和管理员可以查看所有问题
    if (user.role === 'user' || user.role === 'client') {
      console.log('⚠️ 用户是客户/普通用户，检查是否为本人的工单');
      if (issue.clientId !== user._id) {
        console.log('❌ 权限检查失败 - clientId不匹配');
        return createErrorResponse('无权限查看此问题');
      }
      console.log('✅ 权限检查通过 - clientId匹配');
    } else {
      console.log('✅ 用户是管理员/主管/维修工，允许查看所有工单');
    }
    // manager、worker、admin 角色可以查看所有问题

    // 获取状态历史 - 使用查找到的文档的issueId字段
    const historyResult = await db.collection('issueStatusHistory')
      .where({ issueId: issue.issueId })
      .orderBy('createTime', 'desc')
      .get();

    // 如果工单已分配维修工，获取维修工详细信息
    if (issue.assignedWorkerId) {
      try {
        console.log('🔍 查询维修工信息，workerId:', issue.assignedWorkerId);
        const workerResult = await db.collection('users')
          .where({ _id: issue.assignedWorkerId })
          .get();
        
        if (workerResult.data && workerResult.data.length > 0) {
          const worker = workerResult.data[0];
          console.log('✅ 找到维修工信息:', worker.nickname, worker.phone);
          
          const phone = worker.phone || '未知';
          const name = worker.nickname || worker.name || worker.phone || '未知';
          const region = worker.region || worker.address || '未知';
          
          // 将维修工信息添加到 issue 对象中（提供新旧两套字段名）
          // 如果数据库中没有保存这些字段，则动态添加
          if (!issue.workerPhone) issue.workerPhone = phone;
          if (!issue.workerName) issue.workerName = name;
          if (!issue.workerRegion) issue.workerRegion = region;
          if (!issue.assignedWorkerPhone) issue.assignedWorkerPhone = phone;
          if (!issue.assignedWorkerName) issue.assignedWorkerName = name;
          if (!issue.assignedWorkerRegion) issue.assignedWorkerRegion = region;
          
          console.log('✅ 维修工信息已添加到issue:', {
            workerPhone: issue.workerPhone,
            workerName: issue.workerName,
            workerRegion: issue.workerRegion,
            assignedWorkerPhone: issue.assignedWorkerPhone,
            assignedWorkerName: issue.assignedWorkerName,
            assignedWorkerRegion: issue.assignedWorkerRegion
          });
        } else {
          console.log('❌ 未找到维修工信息');
        }
      } catch (workerError) {
        console.error('❌ 查询维修工信息失败:', workerError);
      }
    } else {
      console.log('⚠️ 工单未分配维修工，assignedWorkerId为空');
    }

    return createSuccessResponse({
      issue,
      history: historyResult.data
    });

  } catch (error) {
    return createErrorResponse('获取问题详情失败: ' + error.message);
  }
}

/**
 * 设置问题优先级（主管功能）
 */
async function setIssuePriority(event) {
  try {
    console.log('🎯 setIssuePriority - 开始设置优先级:', event);
    
    // 先验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    let managerUser = user;
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          managerUser = managerResult.data[0];
          console.log('✅ 找到对应的主管账号:', managerUser.nickname, managerUser.role);
        } else {
          console.log('❌ 未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        console.log('❌ 未提供手机号');
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }
    
    const { issueId, priority } = event;

    if (!issueId || !priority) {
      console.log('❌ 参数不完整 - issueId:', issueId, 'priority:', priority);
      return createErrorResponse('参数不完整');
    }

    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      console.log('❌ 无效的优先级:', priority);
      return createErrorResponse('无效的优先级');
    }

    console.log('🔧 开始更新问题优先级 - issueId:', issueId, 'priority:', priority);
    
    // 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('任务不存在');
    }
    
    const realId = taskResult.realId;
    console.log('📊 任务的真实 _id:', realId);
    
    // 更新问题优先级
    const updateResult = await db.collection('issues').doc(realId).update({
      data: {
        priority,
        updateTime: new Date()
      }
    });
    
    console.log('✅ 问题优先级更新成功:', updateResult);

    // 记录状态历史
    const historyResult = await db.collection('issueStatusHistory').add({
      data: {
        _id: generateId('history_'),
        issueId,
        status: 'priority_changed',
        operatorId: managerUser._id,
        operatorName: managerUser.nickname,
        operatorRole: managerUser.role,
        remark: `优先级设置为：${priority}`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 状态历史记录成功:', historyResult);

    return createSuccessResponse(null, '优先级设置成功');

  } catch (error) {
    console.error('❌ 设置优先级失败:', error);
    return createErrorResponse('设置优先级失败: ' + error.message);
  }
}

/**
 * 分配维修工（主管功能）
 */
async function assignWorker(event) {
  try {
    console.log('🎯 assignWorker - 开始分配维修工:', event);
    
    // 先验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    let managerUser = user;
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          managerUser = managerResult.data[0];
          console.log('✅ 找到对应的主管账号:', managerUser.nickname, managerUser.role);
        } else {
          console.log('❌ 未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        console.log('❌ 未提供手机号');
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }
    
    const { issueId, workerId } = event;

    if (!issueId || !workerId) {
      console.log('❌ 参数不完整 - issueId:', issueId, 'workerId:', workerId);
      return createErrorResponse('参数不完整');
    }

    console.log('🔍 检查维修工是否存在 - workerId:', workerId);
    
    // 检查维修工是否存在
    const workerResult = await db.collection('users').doc(workerId).get();
    if (!workerResult.data || workerResult.data.role !== 'worker') {
      console.log('❌ 维修工不存在或角色不正确');
      return createErrorResponse('维修工不存在');
    }

    const worker = workerResult.data;
    console.log('✅ 找到维修工:', worker.nickname);

    console.log('🔧 开始更新问题状态...');
    
    // 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('任务不存在');
    }
    
    const taskData = taskResult.data;
    const realId = taskResult.realId;
    console.log('📊 任务的真实 _id:', realId);
    console.log('📊 任务的 issueId:', taskData.issueId);
    
    // 更新问题状态
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'assigned',
        assignedWorkerId: workerId,
        assignedWorkerName: worker.nickname,
        assignedTime: new Date(),
        updateTime: new Date()
      }
    });
    
    console.log('✅ 问题状态更新成功');

    // 记录状态历史（使用 issueId）
    await db.collection('issueStatusHistory').add({
      data: {
        _id: generateId('history_'),
        issueId: taskData.issueId,
        status: 'assigned',
        operatorId: managerUser._id,
        operatorName: managerUser.nickname,
        operatorRole: managerUser.role,
        remark: `分配给维修工：${worker.nickname}`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 状态历史记录成功');

    // 通知维修工（使用 issueId）
    await sendNotification(
      workerId,
      '新任务分配',
      `您有一个新的维修任务：${taskData.issueId}`,
      'task',
      taskData.issueId
    );

    // 通知客户
    const issueResult = await db.collection('issues').doc(realId).get();
    if (issueResult.data) {
      await sendNotification(
        issueResult.data.clientId,
        '任务分配通知',
        `您的问题已分配给维修工 ${worker.nickname}，请耐心等待处理。`,
        'issue',
        issueId
      );
    }
    
    console.log('✅ 通知发送成功');

    return createSuccessResponse(null, '维修工分配成功');

  } catch (error) {
    console.error('❌ 分配失败:', error);
    return createErrorResponse('分配失败: ' + error.message);
  }
}

/**
 * 获取维修工列表（主管功能）
 */
async function getWorkers(event) {
  try {
    console.log('🎯 getWorkers - 开始获取维修工列表:', event);
    
    // 先验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          console.log('✅ 找到对应的主管账号:', managerResult.data[0].nickname);
        } else {
          console.log('❌ 未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        console.log('❌ 未提供手机号');
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }

    console.log('🔍 开始查询维修工列表...');
    
    const workersResult = await db.collection('users')
      .where({
        role: 'worker',
        status: 'active'
      })
      .field({
        _id: true,
        nickname: true,
        avatar: true,
        phone: true,
        department: true,
        position: true,
        ratingCount: true,
        ratingSum: true,
        averageRating: true,
        lastRatingTime: true,
        region: true
      })
      .get();

    console.log('✅ 查询到', workersResult.data.length, '个维修工');

    const workers = workersResult.data.map(worker => ({
      _id: worker._id,
      nickname: worker.nickname,
      avatar: worker.avatar,
      phone: worker.phone,
      department: worker.department,
      position: worker.position,
      ratingCount: worker.ratingCount || 0,
      ratingSum: worker.ratingSum || 0,
      averageRating: worker.averageRating || 0,
      lastRatingTime: worker.lastRatingTime || null,
      region: worker.region || ''
    }));

    return createSuccessResponse(workers);

  } catch (error) {
    console.error('❌ 获取维修工列表失败:', error);
    return createErrorResponse('获取维修工列表失败: ' + error.message);
  }
}

/**
 * 获取我的任务列表（维修工功能）
 */
async function getMyTasks(event) {
  try {
    console.log('getMyTasks - 开始获取维修工任务');
    
    // 先验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是维修工，尝试通过手机号查找对应的维修工账号
    let workerUser = user;
    if (user.role !== 'worker') {
      console.log('用户不是维修工角色，尝试通过手机号查找维修工账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const workerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: 'worker',
          status: 'active'
        }).get();
        
        if (workerResult.data && workerResult.data.length > 0) {
          workerUser = workerResult.data[0];
          console.log('找到对应的维修工账号:', workerUser.nickname);
        } else {
          console.log('未找到对应的维修工账号');
          return createErrorResponse('当前用户不是维修工或未找到对应的维修工账号');
        }
      } else {
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要维修工角色');
      }
    }
    
    const { page = 1, pageSize = 20, status = '' } = event;

    let query = { assignedWorkerId: workerUser._id };
    
    if (status) {
      query.status = status;
    } else {
      // 默认查询已分配、处理中、配件相关（包括申请中）、已解决的任务
      query.status = _.in(['assigned', 'processing', 'parts_request', 'parts_sent', 'parts_returned', 'parts_received', 'resolved']);
    }

    console.log('查询条件:', JSON.stringify(query, null, 2));

    const result = await paginateQuery(
      db.collection('issues'),
      query,
      { page, pageSize, orderBy: 'assignedTime', order: 'desc' }
    );
    
    console.log('查询结果:', result.data.length, '条记录');

    return createSuccessResponse(result);

  } catch (error) {
    console.error('getMyTasks错误:', error);
    return createErrorResponse('获取任务列表失败: ' + error.message);
  }
}

/**
 * 标记任务为处理中（维修工功能）
 */
async function markTaskProcessing(event) {
  try {
    console.log('🚀 ========== markTaskProcessing 开始 ==========');
    console.log('📋 接收到的参数:', JSON.stringify(event, null, 2));
    
    // 先验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('👤 当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是维修工，尝试通过手机号查找对应的维修工账号
    let workerUser = user;
    if (user.role !== 'worker') {
      console.log('⚠️ 用户不是维修工角色，尝试通过手机号查找维修工账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const workerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: 'worker',
          status: 'active'
        }).get();
        
        if (workerResult.data && workerResult.data.length > 0) {
          workerUser = workerResult.data[0];
          console.log('✅ 找到对应的维修工账号:', workerUser.nickname);
        } else {
          console.log('❌ 未找到对应的维修工账号，检查是否为测试环境...');
          
          // 临时方案：如果是测试环境，允许客户角色操作（用于调试）
          if (user.role === 'client') {
            console.log('⚠️ 测试环境：允许客户角色执行维修工操作');
            // 创建一个临时的维修工用户对象用于操作
            workerUser = {
              ...user,
              role: 'worker',
              nickname: user.nickname + '(临时维修工)'
            };
          } else {
            return createErrorResponse('当前用户不是维修工或未找到对应的维修工账号');
          }
        }
      } else {
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要维修工角色');
      }
    }
    
    const { taskId, processingRecord } = event;

    if (!taskId || !processingRecord) {
      console.log('❌ 参数不完整 - taskId:', taskId, 'processingRecord:', processingRecord);
      return createErrorResponse('参数不完整');
    }

    console.log('🔍 准备更新任务，taskId:', taskId);
    console.log('🔍 taskId类型:', typeof taskId);
    
    // 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(taskId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，taskId:', taskId);
      return createErrorResponse('任务不存在');
    }
    
    const taskData = taskResult.data;
    const realId = taskResult.realId;
    
    console.log('📊 查询到的任务数据:', JSON.stringify(taskData, null, 2));
    console.log('📊 当前任务状态:', taskData.status);
    console.log('📊 任务的真实 _id:', realId);
    
    // 检查当前状态
    if (taskData.status !== 'assigned') {
      console.warn('⚠️ 任务状态不是 assigned，当前状态:', taskData.status);
      return createErrorResponse('任务状态不正确，当前状态: ' + taskData.status);
    }

    console.log('🔧 开始更新任务状态为 processing...');
    console.log('🔧 使用真实的 _id 更新:', realId);
    
    const updateResult = await db.collection('issues').doc(realId).update({
      data: {
        status: 'processing',
        processingTime: new Date(),
        processingRecords: _.push(processingRecord),
        updateTime: new Date()
      }
    });
    
    console.log('✅ 数据库更新结果:', JSON.stringify(updateResult, null, 2));
    console.log('✅ 更新的文档数量:', updateResult.stats.updated);
    
    // 再次查询验证更新结果
    const verifyDoc = await db.collection('issues').doc(realId).get();
    console.log('🔍 验证更新后的状态:', verifyDoc.data.status);
    console.log('🔍 验证更新后的完整数据:', JSON.stringify(verifyDoc.data, null, 2));

    // 记录状态历史（使用 issueId）
    const historyResult = await db.collection('issueStatusHistory').add({
      data: {
        _id: generateId('history_'),
        issueId: taskData.issueId,
        status: 'processing',
        operatorId: workerUser._id,
        operatorName: workerUser.nickname,
        operatorRole: workerUser.role,
        remark: '开始处理任务',
        createTime: new Date()
      }
    });

    console.log('✅ 状态历史记录成功，ID:', historyResult._id);
    console.log('🎉 ========== markTaskProcessing 完成 ==========');

    return createSuccessResponse({
      taskId: taskId,
      newStatus: 'processing',
      updatedCount: updateResult.stats.updated
    }, '任务状态更新成功');

  } catch (error) {
    console.error('❌ ========== markTaskProcessing 失败 ==========');
    console.error('❌ 错误详情:', error);
    console.error('❌ 错误消息:', error.message);
    console.error('❌ 错误堆栈:', error.stack);
    return createErrorResponse('更新任务状态失败: ' + error.message);
  }
}

/**
 * 完成任务（维修工功能）
 */
async function completeTask(event) {
  try {
    console.log('completeTask - 开始完成任务:', event);
    
    // 获取用户信息（支持主管和维修工）
    const { phoneNumber, issueId, taskId, projectType } = event;
    
    // 验证参数
    const id = issueId || taskId;
    if (!id || !projectType) {
      return createErrorResponse('参数不完整：缺少必要参数');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    console.log('当前用户信息:', { 
      id: user._id, 
      phone: user.phone, 
      role: user.role, 
      nickname: user.nickname 
    });

    console.log('🔧 更新任务状态为已完成:', id);

    // 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(id);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，ID:', id);
      return createErrorResponse('任务不存在');
    }
    
    const taskData = taskResult.data;
    const realId = taskResult.realId;
    
    console.log('📊 任务的真实 _id:', realId);
    console.log('📊 任务的 issueId:', taskData.issueId);

    // 🔒 权限检查：如果是配件流程（parts_received状态），只允许主管完成任务
    if (taskData.status === 'parts_received' && user.role === 'worker') {
      console.log('❌ 维修工不能完成需要配件的任务（parts_received状态）');
      return createErrorResponse('需要配件的任务只能由主管完成');
    }
    
    // 🔒 权限检查：如果任务处于配件申请中或配件已发出状态，不能完成任务
    if (taskData.status === 'parts_request' || taskData.status === 'parts_sent') {
      console.log('❌ 任务处于配件流程中，不能完成任务，当前状态:', taskData.status);
      return createErrorResponse('任务处于配件流程中，请先完成配件流程');
    }

    // 准备更新数据
    const updateData = {
      status: 'resolved',
      resolvedTime: new Date(),
      projectType: projectType,
      resolvedBy: user._id,
      resolvedByName: user.nickname || user.name || user.phone,
      updateTime: new Date()
    };

    // 更新任务状态
    await db.collection('issues').doc(realId).update({
      data: updateData
    });

    console.log('✅ 任务状态更新成功');

    // 准备状态历史描述
    const historyDescription = `任务完成（项目类型：${projectType}）`;

    // 记录状态历史（使用 issueId）
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: taskData.issueId,
        status: 'resolved',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: historyDescription,
        description: historyDescription,
        createTime: new Date()
      }
    });

    console.log('✅ 状态历史记录成功');

    // 通知客户
    const issueResult = await db.collection('issues').doc(realId).get();
    if (issueResult.data) {
      await sendNotification(
        issueResult.data.clientId,
        '任务完成通知',
        '您的维修任务已完成，请查看处理结果并评价。',
        'issue',
        taskId
      );
      console.log('✅ 客户通知发送成功');
    }

    return createSuccessResponse(null, '任务完成');

  } catch (error) {
    console.error('❌ 完成任务失败:', error);
    return createErrorResponse('完成任务失败: ' + error.message);
  }
}

/**
 * 申请协助（维修工功能）
 */
async function requestAssistance(event) {
  try {
    console.log('requestAssistance - 开始申请协助');
    
    // 先验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是维修工，尝试通过手机号查找对应的维修工账号
    let workerUser = user;
    if (user.role !== 'worker') {
      console.log('用户不是维修工角色，尝试通过手机号查找维修工账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const workerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: 'worker',
          status: 'active'
        }).get();
        
        if (workerResult.data && workerResult.data.length > 0) {
          workerUser = workerResult.data[0];
          console.log('✅ 找到对应的维修工账号:', workerUser.nickname);
        } else {
          console.log('❌ 未找到对应的维修工账号');
          return createErrorResponse('当前用户不是维修工或未找到对应的维修工账号');
        }
      } else {
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要维修工角色');
      }
    }
    
    const { taskId, reason } = event;

    if (!taskId || !reason) {
      return createErrorResponse('参数不完整');
    }

    console.log('🔧 提交协助申请:', taskId);

    // 记录协助申请
    await db.collection('issueStatusHistory').add({
      data: {
        _id: generateId('history_'),
        issueId: taskId,
        status: 'assistance_requested',
        operatorId: workerUser._id,
        operatorName: workerUser.nickname,
        operatorRole: workerUser.role,
        remark: `申请协助：${reason}`,
        createTime: new Date()
      }
    });

    console.log('✅ 协助申请记录成功');

    // 通知所有主管
    const managers = await db.collection('users').where({
      role: 'manager',
      status: 'active'
    }).get();

    if (managers.data.length > 0) {
      const managerIds = managers.data.map(m => m._id);
      await sendBatchNotifications(
        managerIds,
        '协助申请',
        `维修工 ${workerUser.nickname} 申请协助处理任务：${taskId}`,
        'task',
        taskId
      );
      console.log('✅ 主管通知发送成功');
    }

    return createSuccessResponse(null, '协助申请已提交');

  } catch (error) {
    console.error('❌ 申请协助失败:', error);
    return createErrorResponse('申请协助失败: ' + error.message);
  }
}

/**
 * 获取所有用户（管理员功能）
 */
async function getAllUsers(event) {
  try {
    console.log('👥 getAllUsers - 开始获取所有用户');
    
    // 验证管理员权限
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是管理员，尝试通过手机号查找对应的管理员账号
    let adminUser = user;
    if (user.role !== 'admin') {
      console.log('用户不是管理员角色，尝试通过手机号查找管理员账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const adminResult = await db.collection('users').where({
          phone: phoneNumber,
          role: 'admin',
          status: 'active'
        }).get();
        
        if (adminResult.data && adminResult.data.length > 0) {
          adminUser = adminResult.data[0];
          console.log('✅ 找到对应的管理员账号:', adminUser.nickname);
        } else {
          console.log('❌ 未找到对应的管理员账号');
          return createErrorResponse('权限不足，仅管理员可访问');
        }
      } else {
        console.log('❌ 未提供手机号');
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要管理员角色');
      }
    }
    
    // 获取所有用户
    const result = await db.collection('users').get();
    
    console.log('📊 获取到用户数量:', result.data.length);
    
    // 处理用户数据，移除敏感信息
    const users = result.data.map(user => {
      // 处理地区信息：优先使用 region 字段
      let region = user.region || '';
      let province = user.province || '';
      let city = user.city || '';
      
      // 如果有 region 字段，从中提取省市信息
      if (region) {
        const parts = region.split('-');
        if (parts.length >= 2) {
          province = parts[0];
          city = parts[1];
        }
      } else if (province && city) {
        // 如果没有 region 但有 province 和 city，则拼接（只保留省-市）
        region = `${province}-${city}`;
      }
      
      return {
        id: user._id,
        nickname: user.nickname,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        createTime: user.createTime,
        lastLoginTime: user.lastLoginTime,
        region: region,
        province: province,
        city: city
      };
    });
    
    return createSuccessResponse(users);
    
  } catch (error) {
    console.error('❌ getAllUsers 出错:', error);
    return createErrorResponse('获取用户列表失败: ' + error.message);
  }
}

/**
 * 更新用户角色（管理员功能）
 */
async function updateUserRole(event) {
  try {
    console.log('🔄 updateUserRole - 开始更新用户角色');
    const { userId, newRole } = event;
    
    // 验证管理员权限
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是管理员，尝试通过手机号查找对应的管理员账号
    let adminUser = user;
    if (user.role !== 'admin') {
      console.log('用户不是管理员角色，尝试通过手机号查找管理员账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const adminResult = await db.collection('users').where({
          phone: phoneNumber,
          role: 'admin',
          status: 'active'
        }).get();
        
        if (adminResult.data && adminResult.data.length > 0) {
          adminUser = adminResult.data[0];
          console.log('✅ 找到对应的管理员账号:', adminUser.nickname);
        } else {
          console.log('❌ 未找到对应的管理员账号');
          return createErrorResponse('权限不足，仅管理员可操作');
        }
      } else {
        console.log('❌ 未提供手机号');
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要管理员角色');
      }
    }
    
    // 验证参数
    if (!userId || !newRole) {
      return createErrorResponse('缺少必要参数');
    }
    
    // 验证角色有效性
    const validRoles = ['client', 'manager', 'worker', 'admin'];
    if (!validRoles.includes(newRole)) {
      return createErrorResponse('无效的角色类型');
    }
    
    console.log('🎯 更新用户角色:', { userId, newRole });
    
    // 获取角色对应的配置
    const roleConfig = ROLE_CONFIG[newRole];
    if (!roleConfig) {
      return createErrorResponse('角色配置不存在');
    }
    
    // 准备更新数据 - 同时更新 role, position 和 permissions
    const updateData = {
      role: newRole,
      position: roleConfig.position,
      permissions: roleConfig.permissions,
      updateTime: new Date()
    };
    
    console.log('📝 更新数据:', updateData);
    
    // 更新用户角色、职位和权限
    const updateResult = await db.collection('users').doc(userId).update({
      data: updateData
    });
    
    console.log('✅ 用户信息更新成功:', updateResult);
    
    return createSuccessResponse({
      userId: userId,
      newRole: newRole,
      position: roleConfig.position,
      permissions: roleConfig.permissions,
      message: '用户角色、职位和权限已成功更新'
    });
    
  } catch (error) {
    console.error('❌ updateUserRole 出错:', error);
    return createErrorResponse('更新用户角色失败: ' + error.message);
  }
}

/**
 * 调试用户信息（临时调试函数）
 */
async function debugUserInfo(event) {
  try {
    console.log('🔍 debugUserInfo - 开始调试用户信息');
    const { phoneNumber } = event;
    
    console.log('📞 查询手机号:', phoneNumber);
    
    if (!phoneNumber) {
      return createSuccessResponse({
        message: '未提供手机号',
        phoneNumber: null
      });
    }
    
    // 查询该手机号的所有用户记录
    const userResult = await db.collection('users').where({
      phone: phoneNumber
    }).get();
    
    console.log('🗄️ 数据库查询结果:', userResult.data);
    
    // 查询该手机号的所有用户记录（包括不同状态）
    const allUsersResult = await db.collection('users').where({
      phone: phoneNumber
    }).get();
    
    return createSuccessResponse({
      phoneNumber: phoneNumber,
      activeUsers: userResult.data,
      allUsers: allUsersResult.data,
      userCount: allUsersResult.data.length,
      analysis: {
        hasActiveWorker: userResult.data.some(u => u.role === 'worker' && u.status === 'active'),
        hasAnyWorker: allUsersResult.data.some(u => u.role === 'worker'),
        roles: allUsersResult.data.map(u => ({ role: u.role, status: u.status, nickname: u.nickname }))
      }
    });
    
  } catch (error) {
    console.error('❌ debugUserInfo 出错:', error);
    return createErrorResponse('调试失败: ' + error.message);
  }
}

/**
 * 获取历史记录（维修工功能）
 */
async function getHistory(event) {
  try {
    // 与 getMyTasks 一致：不限制角色，必要时通过手机号映射到维修工账号
    const user = await validateUserPermission(event, []);
    const { page = 1, pageSize = 20, startDate = '', endDate = '' } = event;

    let workerUser = user;
    if (user.role !== 'worker') {
      const { phoneNumber } = event;
      if (phoneNumber) {
        const workerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: 'worker',
          status: 'active'
        }).get();

        if (workerResult.data && workerResult.data.length > 0) {
          workerUser = workerResult.data[0];
        } else {
          return createErrorResponse('当前用户不是维修工或未找到对应的维修工账号');
        }
      } else {
        return createErrorResponse('权限不足：需要维修工角色');
      }
    }

    let query = { assignedWorkerId: workerUser._id };
    
    if (startDate && endDate) {
      query.resolvedTime = _.gte(new Date(startDate)).and(_.lte(new Date(endDate)));
    }

    const result = await paginateQuery(
      db.collection('issues'),
      query,
      { page, pageSize, orderBy: 'resolvedTime', order: 'desc' }
    );

    return createSuccessResponse(result);

  } catch (error) {
    return createErrorResponse('获取历史记录失败: ' + error.message);
  }
}

/**
 * 获取客户反馈列表（客户功能）
 */
async function getClientIssues(event) {
  try {
    const user = await validateUserPermission(event, ['user', 'client']);
    const { page = 1, pageSize = 10, limit = null } = event;

    console.log('获取客户工单，用户手机号:', user.phone, '用户ID:', user._id);

    // 优先用 user._id 查询（标准方式）
    // 如果没有结果，再尝试用手机号查询（兼容旧数据）
    let query = db.collection('issues')
      .where({ clientId: user._id })
      .orderBy('createTime', 'desc');

    // 如果指定了limit，用于首页展示
    if (limit) {
      query = query.limit(limit);
    } else {
      // 分页查询
      query = query.skip((page - 1) * pageSize).limit(pageSize);
    }

    const result = await query.get();

    console.log('查询结果:', result.data.length, '条工单');

    return createSuccessResponse(result.data);

  } catch (error) {
    return createErrorResponse('获取客户反馈失败: ' + error.message);
  }
}

/**
 * 查询反馈进度（客户功能）
 */
async function getFeedbackProgress(event) {
  try {
    const user = await validateUserPermission(event, ['user', 'client']);
    const { feedbackId } = event;

    if (!feedbackId) {
      return createErrorResponse('缺少反馈ID');
    }

    // 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(feedbackId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 反馈不存在，feedbackId:', feedbackId);
      return createErrorResponse('反馈不存在');
    }

    const issue = taskResult.data;

    // 检查权限：客户只能查看自己的反馈
    if (issue.clientId !== user._id) {
      return createErrorResponse('无权限查看此反馈');
    }

    // 获取状态历史
    const historyResult = await db.collection('issueStatusHistory')
      .where({ issueId: feedbackId })
      .orderBy('createTime', 'desc')
      .get();

    return createSuccessResponse({
      issue,
      history: historyResult.data
    });

  } catch (error) {
    return createErrorResponse('获取反馈进度失败: ' + error.message);
  }
}

/**
 * 取消工单（客户功能）
 */
async function cancelIssue(event) {
  try {
    const { issueId, phoneNumber, reason = '' } = event;
    
    if (!issueId) {
      return createErrorResponse('缺少工单ID');
    }
    
    if (!phoneNumber) {
      return createErrorResponse('缺少手机号');
    }
    
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    const taskResult = await getTaskByIdOrIssueId(issueId);
    if (!taskResult || !taskResult.data) {
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 权限检查：客户只能取消自己的工单，主管/管理员可以代取消
    const isManager = ['manager', 'admin'].includes(user.role);
    if (!isManager && issue.clientId && issue.clientId !== user._id) {
      return createErrorResponse('无权限取消该工单');
    }
    
    if (['resolved', 'closed', 'cancelled'].includes(issue.status)) {
      return createErrorResponse('当前状态无法取消');
    }
    
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'cancelled',
        cancelReason: reason,
        cancelledTime: new Date(),
        cancelledBy: user._id,
        cancelledByName: user.nickname || user.name || user.phone,
        updateTime: new Date()
      }
    });
    
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'cancelled',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: reason ? `用户取消：${reason}` : '用户取消工单',
        description: reason ? `用户取消：${reason}` : '用户取消工单',
        createTime: new Date()
      }
    });
    
    return createSuccessResponse(null, '工单已取消');
  } catch (error) {
    console.error('cancelIssue 错误:', error);
    return createErrorResponse('取消工单失败: ' + error.message);
  }
}

/**
 * 删除工单（单删或批量删除）
 * @param {Object} event - 包含 issueIds (数组) 和 phoneNumber
 */
async function deleteIssues(event) {
  try {
    console.log('🗑️ 开始删除工单，参数:', event);
    
    // 验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    let managerUser = user;
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          managerUser = managerResult.data[0];
          console.log('✅ 找到对应的主管账号:', managerUser.nickname, managerUser.role);
        } else {
          console.log('❌ 未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        console.log('❌ 未提供手机号');
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }
    
    const { issueIds } = event;

    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      return createErrorResponse('缺少工单ID或格式不正确');
    }

    console.log(`📋 准备删除 ${issueIds.length} 个工单:`, issueIds);

    // 验证所有工单是否存在
    const issuesResult = await db.collection('issues')
      .where({
        _id: _.in(issueIds)
      })
      .get();

    console.log(`✅ 找到 ${issuesResult.data.length} 个工单`);

    if (issuesResult.data.length === 0) {
      return createErrorResponse('未找到要删除的工单');
    }

    // 批量删除工单
    const deletePromises = issueIds.map(id => 
      db.collection('issues').doc(id).remove()
    );

    const deleteResults = await Promise.all(deletePromises);
    
    // 统计删除结果
    const successCount = deleteResults.filter(r => r.stats && r.stats.removed > 0).length;
    
    console.log(`🗑️ 删除完成: 成功 ${successCount}/${issueIds.length} 个工单`);

    // 删除相关的状态历史记录（可选，如果需要保留历史记录则注释掉）
    try {
      const issueIdsToDelete = issuesResult.data.map(issue => issue.issueId);
      if (issueIdsToDelete.length > 0) {
        await db.collection('issueStatusHistory')
          .where({
            issueId: _.in(issueIdsToDelete)
          })
          .remove();
        console.log(`🗑️ 已删除相关状态历史记录`);
      }
    } catch (historyError) {
      console.error('删除状态历史记录失败:', historyError);
      // 不影响主流程，继续执行
    }

    return createSuccessResponse({
      deletedCount: successCount,
      totalCount: issueIds.length
    }, `成功删除 ${successCount} 个工单`);

  } catch (error) {
    console.error('❌ 删除工单失败:', error);
    return createErrorResponse('删除工单失败: ' + error.message);
  }
}

/**
 * 主函数
 */
exports.main = async (event, context) => {
  const { action } = event;

  console.log('🚀 issues云函数启动 [版本: v2.0.1 - 主管权限修复版]');
  console.log('📋 执行action:', action);
  console.log('📱 请求参数:', JSON.stringify(event, null, 2));

  switch (action) {
    case 'initDatabase':
      // 初始化数据库集合
      try {
        await ensureCollectionsExist();
        return createSuccessResponse(null, '数据库初始化成功');
      } catch (error) {
        return createErrorResponse('数据库初始化失败: ' + error.message);
      }
    case 'submitFeedback':
      return await submitFeedback(event);
    case 'getPendingIssues':
      return await getPendingIssues(event);
    case 'getAssignedIssues':
      return await getAssignedIssues(event);
    case 'getResolvedIssues':
      return await getResolvedIssues(event);
    case 'getIssueDetail':
      return await getIssueDetail(event);
    case 'setIssuePriority':
      return await setIssuePriority(event);
    case 'assignWorker':
      return await assignWorker(event);
    case 'getWorkers':
      return await getWorkers(event);
    case 'getMyTasks':
      return await getMyTasks(event);
    case 'getTaskDetail':
      // 维修工获取任务详情，实际上就是获取工单详情
      return await getIssueDetail(event);
    case 'markTaskProcessing':
      return await markTaskProcessing(event);
    case 'completeTask':
      return await completeTask(event);
    case 'debugUserInfo':
      return await debugUserInfo(event);
    case 'getAllUsers':
      return await getAllUsers(event);
    case 'updateUserRole':
      return await updateUserRole(event);
    case 'requestAssistance':
      return await requestAssistance(event);
    case 'getHistory':
      return await getHistory(event);
    case 'getClientIssues':
      return await getClientIssues(event);
    case 'getFeedbackProgress':
      return await getFeedbackProgress(event);
    case 'cancelIssue':
      return await cancelIssue(event);
    case 'deleteIssues':
      return await deleteIssues(event);
    case 'createTestIssue':
      // 创建测试issue
      try {
        const { issueData } = event;
        if (!issueData) {
          return createErrorResponse('缺少issue数据');
        }
        
        // 生成唯一的issueId
        const issueId = 'ISSUE_' + Math.random().toString(36).substr(2, 15);
        
        // 创建完整的issue数据
        const completeIssueData = {
          issueId: issueId,
          title: issueData.title,
          description: issueData.description,
          category: issueData.category,
          priority: issueData.priority,
          status: 'pending',
          clientId: 'test_client_' + Date.now(),
          images: issueData.images || [],
          createTime: new Date(),
          updateTime: new Date()
        };
        
        const result = await db.collection('issues').add({
          data: completeIssueData
        });
        
        // 创建状态历史记录
        await db.collection('issueStatusHistory').add({
          data: {
            issueId: issueId,
            status: 'pending',
            operatorId: 'system',
            operatorName: '系统',
            description: '问题已提交',
            createTime: new Date()
          }
        });
        
        console.log('测试issue创建成功:', issueId);
        return createSuccessResponse({
          _id: result._id,
          issueId: issueId
        }, '测试issue创建成功');
      } catch (error) {
        return createErrorResponse('创建测试issue失败: ' + error.message);
      }
    case 'initDatabase':
      // 初始化数据库集合（解决database collection not exists错误）
      try {
        console.log('开始初始化数据库集合...');
        
        // 检查并创建issues集合
        try {
          await db.collection('issues').limit(1).get();
          console.log('issues集合已存在');
        } catch (error) {
          if (error.errCode === -502005) {
            console.log('issues集合不存在，正在创建...');
            // 创建集合并插入一个初始记录
            await db.collection('issues').add({
              data: {
                issueId: 'initial_' + Date.now(),
                title: '数据库初始化记录',
                description: '系统初始化自动创建',
                status: 'pending',
                createTime: new Date(),
                updateTime: new Date()
              }
            });
            console.log('issues集合创建成功');
          }
        }
        
        // 检查并创建issueStatusHistory集合
        try {
          await db.collection('issueStatusHistory').limit(1).get();
          console.log('issueStatusHistory集合已存在');
        } catch (error) {
          if (error.errCode === -502005) {
            console.log('issueStatusHistory集合不存在，正在创建...');
            await db.collection('issueStatusHistory').add({
              data: {
                issueId: 'initial_' + Date.now(),
                status: 'initial',
                operatorId: 'system',
                createTime: new Date()
              }
            });
            console.log('issueStatusHistory集合创建成功');
          }
        }
        
        return createSuccessResponse(null, '数据库初始化成功');
      } catch (error) {
        console.error('数据库初始化失败:', error);
        return createErrorResponse('数据库初始化失败: ' + error.message);
      }
    case 'getIssueById':
      // 根据ID获取问题详情
      try {
        const { issueId } = event;
        if (!issueId) {
          return createErrorResponse('缺少issueId参数');
        }
        
        console.log('查询问题详情，issueId:', issueId);
        
        const result = await db.collection('issues').where({
          issueId: issueId
        }).get();
        
        console.log('查询结果:', result.data);
        
        if (result.data && result.data.length > 0) {
          const issue = result.data[0];
          console.log('找到问题详情:', issue.title);
          return createSuccessResponse(issue, '获取问题详情成功');
        } else {
          console.log('未找到对应的问题');
          return createErrorResponse('未找到对应的问题');
        }
      } catch (error) {
        console.error('获取问题详情失败:', error);
        return createErrorResponse('获取问题详情失败: ' + error.message);
      }
    case 'getWorkers':
      // 获取维修工列表（调用真实函数）
      return await getWorkers(event);
    case 'submitRating':
      return await submitRating(event);
    case 'getCompletedIssuesForRating':
      return await getCompletedIssuesForRating(event);
    case 'submitManagerRating':
      return await submitManagerRating(event);
    case 'getManagerStats':
      return await getManagerStats(event);
    case 'startProcessing':
      return await startProcessing(event);
    case 'sendParts':
      return await sendParts(event);
    case 'requestParts':
      return await requestParts(event);
    case 'approveParts':
      return await approveParts(event);
    case 'rejectParts':
      return await rejectParts(event);
    case 'returnParts':
      return await returnParts(event);
    case 'receiveParts':
      return await receiveParts(event);
    case 'approveReturnParts':
      return await approveReturnParts(event);
    case 'rejectReturnParts':
      return await rejectReturnParts(event);
    case 'completeIssue':
      return await completeIssue(event);
    case 'completeIssueWithParts':
      return await completeIssueWithParts(event);
    case 'submitWorkerApplication':
      return await submitWorkerApplication(event);
    case 'getWorkerApplications':
      return await getWorkerApplications(event);
    case 'approveWorkerApplication':
      return await approveWorkerApplication(event);
    case 'rejectWorkerApplication':
      return await rejectWorkerApplication(event);
    case 'getWorkerList':
      return await getWorkerList(event);
    case 'getWorkerProvinces':
      return await getWorkerProvinces(event);
    case 'getWorkerCities':
      return await getWorkerCities(event);
    case 'fixWorkerApprovalStatus':
      return await fixWorkerApprovalStatus(event);
    case 'getWorkerDetail':
      return await getWorkerDetail(event);
    case 'getWorkerIssues':
      return await getWorkerIssues(event);
    case 'getWorkerRatings':
      return await getWorkerRatings(event);
    case 'reverseGeocode':
      return await reverseGeocode(event);
    default:
      return createErrorResponse('未知的操作');
  }
};

/**
 * 获取主管统计数据
 */
async function getManagerStats(event) {
  try {
    console.log('getManagerStats - 开始获取主管统计数据');
    
    // 验证用户身份（不限制角色）
    const user = await validateUserPermission(event, []);
    console.log('当前用户信息:', JSON.stringify(user, null, 2));
    
    // 如果用户不是主管，尝试通过手机号查找对应的主管账号
    let managerUser = user;
    if (user.role !== 'manager' && user.role !== 'admin') {
      console.log('用户不是主管角色，尝试通过手机号查找主管账号...');
      const { phoneNumber } = event;
      
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data && managerResult.data.length > 0) {
          managerUser = managerResult.data[0];
          console.log('找到对应的主管账号:', managerUser.nickname);
        } else {
          console.log('未找到对应的主管账号');
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        return createErrorResponse('权限不足：当前用户角色为 ' + user.role + '，需要主管角色');
      }
    }
    
    // 获取所有问题统计
    const allIssues = await db.collection('issues').get();
    const issues = allIssues.data;
    
    // 按状态统计
    const statusStats = {
      pending: issues.filter(i => i.status === 'pending').length,
      assigned: issues.filter(i => i.status === 'assigned').length,
      processing: issues.filter(i => i.status === 'processing').length,
      resolved: issues.filter(i => i.status === 'resolved').length,
      closed: issues.filter(i => i.status === 'closed').length
    };
    
    // 按优先级统计
    const priorityStats = {
      low: issues.filter(i => i.priority === 'low').length,
      medium: issues.filter(i => i.priority === 'medium').length,
      high: issues.filter(i => i.priority === 'high').length,
      urgent: issues.filter(i => i.priority === 'urgent').length
    };
    
    // 按类别统计
    const categoryStats = {};
    issues.forEach(issue => {
      const category = issue.category || '其他';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    // 计算平均解决时间（小时）
    const resolvedIssues = issues.filter(i => i.status === 'resolved' && i.resolvedTime && i.createTime);
    let avgResolveTime = 0;
    if (resolvedIssues.length > 0) {
      const totalTime = resolvedIssues.reduce((sum, issue) => {
        const createTime = issue.createTime.toDate ? issue.createTime.toDate() : new Date(issue.createTime);
        const resolvedTime = issue.resolvedTime.toDate ? issue.resolvedTime.toDate() : new Date(issue.resolvedTime);
        const hours = (resolvedTime - createTime) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      avgResolveTime = Math.round(totalTime / resolvedIssues.length * 10) / 10;
    }
    
    // 计算满意度
    const ratedIssues = issues.filter(i => i.satisfaction && i.satisfaction > 0);
    let avgSatisfaction = 0;
    if (ratedIssues.length > 0) {
      const totalSatisfaction = ratedIssues.reduce((sum, issue) => sum + issue.satisfaction, 0);
      avgSatisfaction = Math.round(totalSatisfaction / ratedIssues.length * 10) / 10;
    }
    
    // 获取维修工统计
    const workers = await db.collection('users').where({
      role: 'worker',
      status: 'active'
    }).get();
    
    const workerStats = workers.data.map(worker => {
      const workerIssues = issues.filter(i => i.assignedWorkerId === worker._id);
      const workerResolved = workerIssues.filter(i => i.status === 'resolved');
      const workerRated = workerResolved.filter(i => i.satisfaction && i.satisfaction > 0);
      
      let workerAvgSatisfaction = 0;
      if (workerRated.length > 0) {
        workerAvgSatisfaction = Math.round(workerRated.reduce((sum, i) => sum + i.satisfaction, 0) / workerRated.length * 10) / 10;
      }
      
      return {
        workerId: worker._id,
        workerName: worker.nickname,
        totalTasks: workerIssues.length,
        completedTasks: workerResolved.length,
        avgSatisfaction: workerAvgSatisfaction,
        inProgressTasks: workerIssues.filter(i => i.status === 'processing').length
      };
    });
    
    // 今日统计
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIssues = issues.filter(i => {
      const createTime = i.createTime.toDate ? i.createTime.toDate() : new Date(i.createTime);
      return createTime >= today;
    });
    
    const todayStats = {
      newIssues: todayIssues.length,
      resolvedToday: issues.filter(i => {
        if (!i.resolvedTime) return false;
        const resolvedTime = i.resolvedTime.toDate ? i.resolvedTime.toDate() : new Date(i.resolvedTime);
        return resolvedTime >= today;
      }).length,
      pendingIssues: statusStats.pending
    };
    
    const stats = {
      statusStats,
      priorityStats,
      categoryStats,
      avgResolveTime,
      avgSatisfaction,
      workerStats,
      todayStats,
      totalIssues: issues.length,
      totalWorkers: workers.data.length
    };
    
    console.log('统计数据计算完成:', JSON.stringify(stats, null, 2));
    
    return createSuccessResponse(stats);
    
  } catch (error) {
    console.error('getManagerStats错误:', error);
    return createErrorResponse('获取统计数据失败: ' + error.message);
  }
}

/**
 * 提交服务评价（客户功能）
 */
async function submitRating(event) {
  try {
    const user = await validateUserPermission(event, ['user', 'client']);
    const { issueId, satisfaction, feedback } = event;

    if (!issueId || !satisfaction) {
      return createErrorResponse('参数不完整');
    }

    if (satisfaction < 1 || satisfaction > 5) {
      return createErrorResponse('评分必须在1-5之间');
    }

    // 检查问题是否存在且已解决
    const issueResult = await db.collection('issues').where({
      issueId: issueId
    }).get();

    if (issueResult.data.length === 0) {
      return createErrorResponse('问题不存在');
    }

    const issue = issueResult.data[0];

    // 检查权限：客户只能评价自己的问题
    if (issue.clientId !== user._id) {
      return createErrorResponse('无权限评价此问题');
    }

    // 检查问题是否已解决
    if (issue.status !== 'resolved') {
      return createErrorResponse('只能评价已解决的问题');
    }

    // 更新问题评价
    await db.collection('issues').where({
      issueId: issueId
    }).update({
      data: {
        satisfaction: satisfaction,
        feedback: feedback || '',
        updateTime: new Date()
      }
    });

    // 记录状态历史
    await db.collection('issueStatusHistory').add({
      data: {
        _id: generateId('history_'),
        issueId: issueId,
        status: 'rated',
        operatorId: user._id,
        operatorName: user.nickname,
        operatorRole: user.role,
        remark: `客户评价：${satisfaction}星${feedback ? '，反馈：' + feedback : ''}`,
        createTime: new Date()
      }
    });

    // 更新维修工的评分统计
    if (issue.assignedWorkerId) {
      try {
        console.log('📊 开始更新维修工评分统计，维修工ID:', issue.assignedWorkerId);
        
        // 获取维修工当前的评分数据
        const workerResult = await db.collection('users').doc(issue.assignedWorkerId).get();
        
        if (workerResult.data) {
          const worker = workerResult.data;
          
          // 初始化评分统计字段（如果不存在）
          const currentRatingCount = worker.ratingCount || 0;
          const currentRatingSum = worker.ratingSum || 0;
          const currentAverageRating = worker.averageRating || 0;
          
          // 计算新的统计数据
          const newRatingCount = currentRatingCount + 1;
          const newRatingSum = currentRatingSum + satisfaction;
          const newAverageRating = newRatingSum / newRatingCount;
          
          console.log('📊 评分统计:', {
            旧评分次数: currentRatingCount,
            新评分次数: newRatingCount,
            旧评分总和: currentRatingSum,
            新评分总和: newRatingSum,
            旧平均评分: currentAverageRating,
            新平均评分: newAverageRating
          });
          
          // 更新维修工的评分统计
          await db.collection('users').doc(issue.assignedWorkerId).update({
            data: {
              ratingCount: newRatingCount,
              ratingSum: newRatingSum,
              averageRating: Math.round(newAverageRating * 100) / 100, // 保留两位小数
              lastRatingTime: new Date(),
              updateTime: new Date()
            }
          });
          
          console.log('✅ 维修工评分统计更新成功');
        } else {
          console.warn('⚠️ 未找到维修工信息，ID:', issue.assignedWorkerId);
        }
      } catch (error) {
        console.error('❌ 更新维修工评分统计失败:', error);
        // 评分统计更新失败不影响评价提交的成功
      }
    } else {
      console.log('ℹ️ 该问题未分配维修工，跳过评分统计更新');
    }

    return createSuccessResponse(null, '评价提交成功');

  } catch (error) {
    return createErrorResponse('提交评价失败: ' + error.message);
  }
}

/**
 * 获取已完成的工单列表（主管评分用）
 */
async function getCompletedIssuesForRating(event) {
  try {
    const user = await validateUserPermission(event, ['manager', 'admin']);
    const { page = 1, pageSize = 10, filterType = 'all' } = event;

    console.log('📋 开始获取已完成工单，筛选类型:', filterType);

    // 构建查询条件
    let where = {
      status: 'resolved' // 只查询已解决的工单
    };

    // 根据筛选类型添加条件
    if (filterType === 'rated') {
      // 已评价：managerSatisfaction 字段存在且不为空
      where.managerSatisfaction = _.exists(true);
    } else if (filterType === 'unrated') {
      // 待评价：managerSatisfaction 字段不存在或为空
      where.managerSatisfaction = _.exists(false);
    }

    // 查询总数
    const countResult = await db.collection('issues')
      .where(where)
      .count();
    
    const total = countResult.total;

    // 查询数据
    const result = await db.collection('issues')
      .where(where)
      .orderBy('resolvedTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    console.log('✅ 获取成功，共', total, '条记录');

    return createSuccessResponse({
      data: result.data,
      total: total,
      page: page,
      pageSize: pageSize
    }, '获取成功');

  } catch (error) {
    console.error('❌ 获取已完成工单失败:', error);
    return createErrorResponse('获取已完成工单失败: ' + error.message);
  }
}

/**
 * 提交主管评价
 */
async function submitManagerRating(event) {
  try {
    const user = await validateUserPermission(event, ['manager', 'admin']);
    const { issueId, satisfaction, feedback } = event;

    console.log('📝 主管提交评价:', { issueId, satisfaction, feedback });

    if (!issueId || !satisfaction) {
      return createErrorResponse('参数不完整');
    }

    if (satisfaction < 1 || satisfaction > 5) {
      return createErrorResponse('评分必须在1-5之间');
    }

    // 检查问题是否存在且已解决
    let issueResult = { data: [] };
    
    // 判断 ID 类型并选择查询方式
    const isMongoId = issueId.startsWith('issue_'); // MongoDB 生成的 _id
    const isFormattedId = issueId.startsWith('M-') || issueId.startsWith('ISSUE_'); // 格式化的 issueId
    
    // 优先通过 issueId 字段查询（如果是格式化的 ID）
    if (isFormattedId) {
      console.log('✅ 通过 issueId 字段查询:', issueId);
      issueResult = await db.collection('issues').where({
        issueId: issueId
      }).get();
      console.log('📋 查询结果数量:', issueResult.data.length);
    }
    
    // 如果 issueId 查询失败，尝试通过 _id 查询
    if (issueResult.data.length === 0) {
      console.log('🔍 尝试通过 _id 字段查询:', issueId);
      try {
        const docResult = await db.collection('issues').doc(issueId).get();
        if (docResult.data) {
          issueResult.data = [docResult.data];
          console.log('✅ 通过 _id 查询成功');
        }
      } catch (docError) {
        console.log('❌ 通过 _id 查询失败:', docError.message);
      }
    }

    if (issueResult.data.length === 0) {
      console.error('❌ 所有查询方式都失败了，issueId:', issueId);
      return createErrorResponse('问题不存在');
    }

    const issue = issueResult.data[0];
    console.log('✅ 找到工单:', issue.issueId || issue._id);

    // 检查问题是否已解决
    if (issue.status !== 'resolved') {
      return createErrorResponse('只能评价已解决的问题');
    }

    // 使用工单的实际 _id 或 issueId 进行更新
    const updateQuery = issue.issueId ? { issueId: issue.issueId } : { _id: issue._id };
    console.log('📝 使用查询条件更新:', updateQuery);
    
    // 更新问题评价（主管评价用单独的字段）
    await db.collection('issues').where(updateQuery).update({
      data: {
        managerSatisfaction: satisfaction,
        managerFeedback: feedback || '',
        managerRatedTime: new Date(),
        managerRatedBy: user._id,
        managerRatedByName: user.nickname || user.name || '主管',
        updateTime: new Date()
      }
    });

    // 记录状态历史（使用工单的实际 issueId 或 _id）
    await db.collection('issueStatusHistory').add({
      data: {
        _id: generateId('history_'),
        issueId: issue.issueId || issue._id,
        status: 'manager_rated',
        operatorId: user._id,
        operatorName: user.nickname || user.name || '主管',
        operatorRole: user.role,
        remark: `主管评价：${satisfaction}星${feedback ? '，反馈：' + feedback : ''}`,
        createTime: new Date()
      }
    });

    console.log('✅ 主管评价提交成功');
    return createSuccessResponse(null, '评价提交成功');

  } catch (error) {
    console.error('❌ 提交主管评价失败:', error);
    return createErrorResponse('提交评价失败: ' + error.message);
  }
}

/**
 * 发出配件（主管操作）
 */
/**
 * 通过手机号获取用户信息
 */
async function getUserByPhone(phoneNumber) {
  if (!phoneNumber) {
    console.error('❌ getUserByPhone: 手机号为空');
    return null;
  }
  
  try {
    const result = await db.collection('users').where({
      phone: phoneNumber,
      status: 'active'
    }).get();
    
    if (result.data && result.data.length > 0) {
      // 如果有多个同手机号的用户，优先返回主管或维修工
      const rolePriority = { admin: 4, manager: 3, worker: 2, client: 1, user: 1 };
      const sorted = result.data.sort((a, b) => (rolePriority[b.role] || 0) - (rolePriority[a.role] || 0));
      return sorted[0];
    }
    
    console.warn('⚠️ getUserByPhone: 未找到手机号对应的用户:', phoneNumber);
    return null;
  } catch (error) {
    console.error('❌ getUserByPhone 出错:', error);
    return null;
  }
}

/**
 * 开始处理工单
 */
async function startProcessing(event) {
  try {
    const { issueId, needParts, partsDetail, phoneNumber } = event;
    
    console.log('startProcessing - 开始处理工单:', { issueId, needParts, phoneNumber });
    
    // 验证参数
    if (!issueId) {
      return createErrorResponse('缺少工单ID');
    }
    
    // 如果需要配件，必须填写配件详情
    if (needParts && !partsDetail) {
      return createErrorResponse('需要配件时必须填写配件详情');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // ✅ 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('任务不存在');
    }
    
    const taskData = taskResult.data;
    const realId = taskResult.realId;
    
    console.log('📊 任务的真实 _id:', realId);
    console.log('📊 任务的 issueId:', taskData.issueId);
    console.log('📊 当前任务状态:', taskData.status);
    
    // 更新工单状态为"处理中"
    const updateData = {
      status: 'processing',
      needParts: needParts || false,
      processingTime: new Date(),
      updateTime: new Date()
    };
    
    // 如果需要配件，保存配件详情
    if (needParts) {
      updateData.partsDetail = partsDetail;
    }
    
    console.log('📝 准备更新工单，更新数据:', JSON.stringify(updateData, null, 2));
    
    const updateResult = await db.collection('issues').doc(realId).update({
      data: updateData
    });
    
    console.log('✅ 数据库更新结果:', JSON.stringify(updateResult, null, 2));
    
    // 验证更新是否成功
    const verifyResult = await db.collection('issues').doc(realId).get();
    
    if (!verifyResult.data) {
      console.error('❌ 验证失败：找不到工单');
      return createErrorResponse('工单不存在');
    }
    
    const issue = verifyResult.data;
    console.log('✅ 验证更新结果 - 当前状态:', issue.status);
    console.log('✅ 验证更新结果 - needParts:', issue.needParts);
    console.log('✅ 验证更新结果 - issueId:', issue.issueId);
    
    // 记录状态历史（使用工单的真实 issueId）
    const historyResult = await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,  // 使用工单的真实 issueId
        status: 'processing',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: needParts ? `开始处理（需要配件：${partsDetail}）` : '开始处理（不需要配件）',
        createTime: new Date()
      }
    });
    
    console.log('✅ 状态历史记录结果:', JSON.stringify(historyResult, null, 2));
    console.log('✅ 开始处理工单成功 - 返回响应');
    return createSuccessResponse(null, '开始处理工单');
    
  } catch (error) {
    console.error('❌ 开始处理工单失败:', error);
    return createErrorResponse('开始处理工单失败: ' + error.message);
  }
}

async function sendParts(event) {
  try {
    const { issueId, partsDetail, problemDescription, phoneNumber } = event;
    
    console.log('sendParts - 开始发出配件:', { issueId, partsDetail, phoneNumber });
    
    // 验证参数（工作时长不再是必填项）
    if (!issueId || !partsDetail || !problemDescription) {
      return createErrorResponse('缺少必要参数');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // 🔒 权限检查：只有主管可以直接发出配件
    if (user.role !== 'manager') {
      return createErrorResponse('只有主管可以直接发出配件，维修工请使用"申请发出配件"功能');
    }
    
    // ✅ 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"处理中"且需要配件
    if (issue.status !== 'processing' || !issue.needParts) {
      return createErrorResponse('工单状态不正确，无法发出配件');
    }
    
    // 🔍 查询维修工信息（如果工单已分配维修工）
    let workerInfo = {};
    if (issue.assignedWorkerId) {
      console.log('🔍 查询维修工信息，workerId:', issue.assignedWorkerId);
      try {
        const workerRes = await db.collection('users').doc(issue.assignedWorkerId).get();
        if (workerRes.data) {
          const worker = workerRes.data;
          const phone = worker.phone || '未知';
          const name = worker.nickname || worker.name || worker.phone || '未知';
          const region = worker.region || '未知';
          
          workerInfo = {
            // 新字段名（推荐使用）
            assignedWorkerPhone: phone,
            assignedWorkerName: name,
            assignedWorkerRegion: region,
            // 旧字段名（保持兼容）
            workerPhone: phone,
            workerName: name,
            workerRegion: region
          };
          console.log('✅ 维修工信息已查询:', workerInfo);
        }
      } catch (err) {
        console.warn('⚠️ 查询维修工信息失败:', err);
      }
    } else {
      console.log('⚠️ 工单未分配维修工');
    }
    
    // 更新工单状态为"配件已发出"（包含维修工信息）
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'parts_sent',
        partsDetail: partsDetail,
        problemDescription: problemDescription,
        partsSentTime: new Date(),
        partsSentBy: user._id,
        partsSentByName: user.nickname || user.name || user.phone,
        updateTime: new Date(),
        ...workerInfo // 添加维修工信息（包含新旧两套字段名）
      }
    });
    
    // 记录状态历史（使用工单的真实 issueId）
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'parts_sent',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: `主管直接发出配件：${partsDetail}`,
        description: `主管直接发出配件：${partsDetail}`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 配件发出成功');
    return createSuccessResponse(null, '配件已发出');
    
  } catch (error) {
    console.error('❌ 发出配件失败:', error);
    return createErrorResponse('发出配件失败: ' + error.message);
  }
}

/**
 * 维修工申请发出配件
 */
async function requestParts(event) {
  try {
    const { issueId, partsDetail, problemDescription, requestReason, phoneNumber } = event;
    
    console.log('requestParts - 维修工申请发出配件:', { issueId, partsDetail, phoneNumber });
    
    // 验证参数
    if (!issueId || !partsDetail || !problemDescription || !requestReason) {
      return createErrorResponse('缺少必要参数：配件详情、问题描述和申请理由为必填项');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // 验证用户角色（只有维修工可以申请）
    if (user.role !== 'worker') {
      return createErrorResponse('只有维修工可以申请发出配件');
    }
    
    // 查询任务
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"处理中"且需要配件
    if (issue.status !== 'processing' || !issue.needParts) {
      return createErrorResponse('工单状态不正确，无法申请发出配件');
    }
    
    // 更新工单状态为"配件申请中"
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'parts_request',
        partsDetail: partsDetail,
        problemDescription: problemDescription,
        requestReason: requestReason,
        requestTime: new Date(),
        requestBy: user._id,
        requestByName: user.nickname || user.name || user.phone,
        updateTime: new Date()
      }
    });
    
    // 记录状态历史
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'parts_request',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: `申请发出配件：${partsDetail}，申请理由：${requestReason}`,
        description: `申请发出配件：${partsDetail}`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 配件申请提交成功');
    return createSuccessResponse(null, '配件申请已提交，等待主管审批');
    
  } catch (error) {
    console.error('❌ 申请发出配件失败:', error);
    return createErrorResponse('申请发出配件失败: ' + error.message);
  }
}

/**
 * 主管审批配件申请（同意）
 */
async function approveParts(event) {
  try {
    const { issueId, approvalNote, phoneNumber } = event;
    
    console.log('approveParts - 主管审批配件申请（同意）:', { issueId, phoneNumber });
    
    // 验证参数
    if (!issueId) {
      return createErrorResponse('缺少工单ID');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // 验证用户角色（只有主管可以审批）
    if (user.role !== 'manager') {
      return createErrorResponse('只有主管可以审批配件申请');
    }
    
    // 查询任务
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"配件申请中"
    if (issue.status !== 'parts_request') {
      return createErrorResponse('工单状态不正确，当前状态不是配件申请中');
    }
    
    // 🔍 查询维修工信息（如果工单已分配维修工）
    let workerInfo = {};
    if (issue.assignedWorkerId) {
      console.log('🔍 查询维修工信息，workerId:', issue.assignedWorkerId);
      try {
        const workerRes = await db.collection('users').doc(issue.assignedWorkerId).get();
        if (workerRes.data) {
          const worker = workerRes.data;
          const phone = worker.phone || '未知';
          const name = worker.nickname || worker.name || worker.phone || '未知';
          const region = worker.region || '未知';
          
          workerInfo = {
            // 新字段名（推荐使用）
            assignedWorkerPhone: phone,
            assignedWorkerName: name,
            assignedWorkerRegion: region,
            // 旧字段名（保持兼容）
            workerPhone: phone,
            workerName: name,
            workerRegion: region
          };
          console.log('✅ 维修工信息已查询:', workerInfo);
        }
      } catch (err) {
        console.warn('⚠️ 查询维修工信息失败:', err);
      }
    }
    
    // 更新工单状态为"配件已发出"（包含维修工信息）
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'parts_sent',
        approvalTime: new Date(),
        approvalBy: user._id,
        approvalByName: user.nickname || user.name || user.phone,
        approvalNote: approvalNote || '审批通过',
        partsSentTime: new Date(),
        partsSentBy: user._id,
        partsSentByName: user.nickname || user.name || user.phone,
        updateTime: new Date(),
        ...workerInfo // 添加维修工信息（包含新旧两套字段名）
      }
    });
    
    // 记录状态历史
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'parts_sent',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: `审批通过并发出配件：${issue.partsDetail}${approvalNote ? '，审批意见：' + approvalNote : ''}`,
        description: `审批通过并发出配件：${issue.partsDetail}`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 配件申请审批通过');
    return createSuccessResponse(null, '配件申请已审批通过，配件已发出');
    
  } catch (error) {
    console.error('❌ 审批配件申请失败:', error);
    return createErrorResponse('审批配件申请失败: ' + error.message);
  }
}

/**
 * 主管拒绝配件申请
 */
async function rejectParts(event) {
  try {
    const { issueId, rejectReason, phoneNumber } = event;
    
    console.log('rejectParts - 主管拒绝配件申请:', { issueId, phoneNumber });
    
    // 验证参数
    if (!issueId || !rejectReason) {
      return createErrorResponse('缺少必要参数：拒绝理由为必填项');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // 验证用户角色（只有主管可以审批）
    if (user.role !== 'manager') {
      return createErrorResponse('只有主管可以审批配件申请');
    }
    
    // 查询任务
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"配件申请中"
    if (issue.status !== 'parts_request') {
      return createErrorResponse('工单状态不正确，当前状态不是配件申请中');
    }
    
    // 更新工单状态为"处理中"（退回到处理中状态）
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'processing',
        rejectTime: new Date(),
        rejectBy: user._id,
        rejectByName: user.nickname || user.name || user.phone,
        rejectReason: rejectReason,
        updateTime: new Date()
      }
    });
    
    // 记录状态历史
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'processing',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: `配件申请已拒绝，拒绝理由：${rejectReason}`,
        description: `配件申请已拒绝`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 配件申请已拒绝');
    return createSuccessResponse(null, '配件申请已拒绝');
    
  } catch (error) {
    console.error('❌ 拒绝配件申请失败:', error);
    return createErrorResponse('拒绝配件申请失败: ' + error.message);
  }
}

/**
 * 发出返件（维修工或主管发出返件）
 * 注意：发出返件后进入"返件待审批"状态，需要主管审批确认收货
 */
async function returnParts(event) {
  try {
    const { issueId, trackingNumber, partsImages, phoneNumber } = event;
    
    console.log('returnParts - 开始发出返件:', { issueId, trackingNumber, phoneNumber });
    
    // 验证参数（快递单号为可选项）
    if (!issueId || !partsImages || partsImages.length === 0) {
      return createErrorResponse('缺少必要参数：配件图片为必填项');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // ✅ 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"配件已发出"
    if (issue.status !== 'parts_sent') {
      return createErrorResponse('工单状态不正确，无法发出返件');
    }
    
    // 更新工单状态为"返件已收到"（直接跳过审批流程）
    const updateData = {
      status: 'parts_received',
      partsImages: partsImages,
      partsReturnedTime: new Date(),
      partsReturnedBy: user._id,
      partsReturnedByName: user.nickname || user.name || user.phone,
      partsReceivedTime: new Date(),
      partsReceivedBy: user._id,
      partsReceivedByName: user.nickname || user.name || user.phone,
      updateTime: new Date()
    };
    
    // 如果有快递单号，则更新快递单号
    if (trackingNumber && trackingNumber.trim()) {
      updateData.returnTrackingNumber = trackingNumber.trim();
    }
    
    await db.collection('issues').doc(realId).update({
      data: updateData
    });
    
    // 记录状态历史（使用工单的真实 issueId）
    const remarkText = trackingNumber && trackingNumber.trim() 
      ? `返件已发出并收到，快递单号：${trackingNumber.trim()}`
      : '返件已发出并收到（无快递单号）';
      
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'parts_received',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: remarkText,
        description: remarkText,
        createTime: new Date()
      }
    });
    
    console.log('✅ 返件发出成功，状态已更新为parts_received');
    return createSuccessResponse(null, '返件已提交并确认收到');
    
  } catch (error) {
    console.error('❌ 发出返件失败:', error);
    return createErrorResponse('发出返件失败: ' + error.message);
  }
}

/**
 * 主管审批返件（同意）
 */
async function approveReturnParts(event) {
  try {
    const { issueId, approvalNote, phoneNumber } = event;
    
    console.log('approveReturnParts - 主管审批返件（同意）:', { issueId, phoneNumber });
    
    // 验证参数
    if (!issueId) {
      return createErrorResponse('缺少工单ID');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // 验证用户角色（只有主管可以审批）
    if (user.role !== 'manager' && user.role !== 'admin') {
      return createErrorResponse('只有主管可以审批返件');
    }
    
    // 查询任务
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"返件待审批"
    if (issue.status !== 'parts_return_approval') {
      return createErrorResponse('工单状态不正确，当前状态不是返件待审批');
    }
    
    // 更新工单状态为"返件已收到"
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'parts_received',
        returnApprovalTime: new Date(),
        returnApprovalBy: user._id,
        returnApprovalByName: user.nickname || user.name || user.phone,
        returnApprovalNote: approvalNote || '审批通过',
        partsReceivedTime: new Date(),
        partsReceivedBy: user._id,
        partsReceivedByName: user.nickname || user.name || user.phone,
        updateTime: new Date()
      }
    });
    
    // 记录状态历史
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'parts_received',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: approvalNote || '主管已确认收到返件',
        description: approvalNote || '主管已确认收到返件',
        createTime: new Date()
      }
    });
    
    console.log('✅ 返件审批通过，状态已更新为parts_received');
    return createSuccessResponse(null, '返件已确认收到');
    
  } catch (error) {
    console.error('❌ 审批返件失败:', error);
    return createErrorResponse('审批返件失败: ' + error.message);
  }
}

/**
 * 主管拒绝返件
 */
async function rejectReturnParts(event) {
  try {
    const { issueId, rejectionNote, phoneNumber } = event;
    
    console.log('rejectReturnParts - 主管拒绝返件:', { issueId, phoneNumber });
    
    // 验证参数
    if (!issueId) {
      return createErrorResponse('缺少工单ID');
    }
    
    if (!rejectionNote || rejectionNote.trim() === '') {
      return createErrorResponse('请填写拒绝原因');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // 验证用户角色（只有主管可以拒绝）
    if (user.role !== 'manager' && user.role !== 'admin') {
      return createErrorResponse('只有主管可以拒绝返件');
    }
    
    // 查询任务
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"返件待审批"
    if (issue.status !== 'parts_return_approval') {
      return createErrorResponse('工单状态不正确，当前状态不是返件待审批');
    }
    
    // 更新工单状态为"配件已发出"（退回到发出配件状态，维修工需要重新发出返件）
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'parts_sent',
        returnRejectionTime: new Date(),
        returnRejectionBy: user._id,
        returnRejectionByName: user.nickname || user.name || user.phone,
        returnRejectionNote: rejectionNote.trim(),
        // 清除返件相关信息，让维修工重新提交
        partsImages: _.remove(),
        partsReturnedTime: _.remove(),
        partsReturnedBy: _.remove(),
        partsReturnedByName: _.remove(),
        returnTrackingNumber: _.remove(),
        updateTime: new Date()
      }
    });
    
    // 记录状态历史
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'parts_sent',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: `返件被拒绝：${rejectionNote.trim()}`,
        description: `返件被拒绝：${rejectionNote.trim()}`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 返件已拒绝，状态已退回到parts_sent');
    return createSuccessResponse(null, '返件已拒绝');
    
  } catch (error) {
    console.error('❌ 拒绝返件失败:', error);
    return createErrorResponse('拒绝返件失败: ' + error.message);
  }
}

/**
 * 确认收到返件
 */
async function receiveParts(event) {
  try {
    const { issueId, receivedNote, phoneNumber } = event;
    
    console.log('receiveParts - 确认收到返件:', { issueId, phoneNumber });
    
    // 验证参数
    if (!issueId) {
      return createErrorResponse('缺少工单ID');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // ✅ 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 检查当前状态是否为"返件已发出"
    if (issue.status !== 'parts_returned') {
      return createErrorResponse('工单状态不正确，无法确认收到返件');
    }
    
    // 更新工单状态为"返件已收到"
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'parts_received',
        partsReceivedTime: new Date(),
        partsReceivedBy: user._id,
        partsReceivedByName: user.nickname || user.name || user.phone,
        receivedNote: receivedNote || '',
        updateTime: new Date()
      }
    });
    
    // 记录状态历史（使用工单的真实 issueId）
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'parts_received',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        operatorRole: user.role,
        remark: receivedNote ? `返件已收到：${receivedNote}` : '返件已收到',
        description: receivedNote ? `返件已收到：${receivedNote}` : '返件已收到',
        createTime: new Date()
      }
    });
    
    console.log('✅ 返件确认成功');
    return createSuccessResponse(null, '返件已确认');
    
  } catch (error) {
    console.error('❌ 确认返件失败:', error);
    return createErrorResponse('确认返件失败: ' + error.message);
  }
}

/**
 * 完成工单（不需要配件）
 */
async function completeIssue(event) {
  try {
    const { issueId, problemDescription, workHours, phoneNumber } = event;
    
    console.log('completeIssue - 开始完成工单:', { issueId, phoneNumber });
    
    // 验证参数
    if (!issueId || !problemDescription || !workHours) {
      return createErrorResponse('缺少必要参数');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // ✅ 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 更新工单状态为"已解决"
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'resolved',
        problemDescription: problemDescription,
        workHours: workHours,
        needParts: false,
        resolvedTime: new Date(),
        resolvedBy: user._id,
        resolvedByName: user.nickname || user.name || user.phone,
        updateTime: new Date()
      }
    });
    
    // 记录状态历史（使用工单的真实 issueId）
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'resolved',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        description: `工单已完成，工时：${workHours}小时`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 工单完成成功');
    return createSuccessResponse(null, '工单已完成');
    
  } catch (error) {
    console.error('❌ 完成工单失败:', error);
    return createErrorResponse('完成工单失败: ' + error.message);
  }
}

/**
 * 完成工单（需要配件 - 维修工发回配件后）
 */
async function completeIssueWithParts(event) {
  try {
    const { issueId, partsDetail, problemDescription, workHours, trackingNumber, partsImages, phoneNumber } = event;
    
    console.log('completeIssueWithParts - 开始完成工单（含配件）:', { issueId, trackingNumber, phoneNumber });
    
    // 验证参数
    if (!issueId || !partsDetail || !problemDescription || !workHours || !trackingNumber || !partsImages) {
      return createErrorResponse('缺少必要参数');
    }
    
    // 获取用户信息
    const user = await getUserByPhone(phoneNumber);
    if (!user) {
      return createErrorResponse('用户不存在');
    }
    
    // ✅ 查询任务（支持 issueId 或 _id）
    const taskResult = await getTaskByIdOrIssueId(issueId);
    
    if (!taskResult || !taskResult.data) {
      console.error('❌ 任务不存在，issueId:', issueId);
      return createErrorResponse('工单不存在');
    }
    
    const issue = taskResult.data;
    const realId = taskResult.realId;
    
    // 更新工单状态为"已解决"
    await db.collection('issues').doc(realId).update({
      data: {
        status: 'resolved',
        partsDetail: partsDetail,
        problemDescription: problemDescription,
        workHours: workHours,
        needParts: true,
        trackingNumber: trackingNumber,
        partsImages: partsImages,
        partsReturnedTime: new Date(),
        partsReturnedBy: user._id,
        partsReturnedByName: user.nickname || user.name || user.phone,
        resolvedTime: new Date(),
        resolvedBy: user._id,
        resolvedByName: user.nickname || user.name || user.phone,
        updateTime: new Date()
      }
    });
    
    // 记录状态历史（使用工单的真实 issueId）
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: issue.issueId,
        status: 'resolved',
        operatorId: user._id,
        operatorName: user.nickname || user.name || user.phone,
        description: `配件已发回（快递号：${trackingNumber}），工单已完成，工时：${workHours}小时`,
        createTime: new Date()
      }
    });
    
    console.log('✅ 工单完成成功（含配件）');
    return createSuccessResponse(null, '工单已完成');
    
  } catch (error) {
    console.error('❌ 完成工单失败:', error);
    return createErrorResponse('完成工单失败: ' + error.message);
  }
}

/**
 * 提交维修工申请
 */
async function submitWorkerApplication(event) {
  try {
    const { userId, userPhone, name, phone, province, city, storeName, address, storeImage, experience } = event;
    
    console.log('submitWorkerApplication - 开始提交维修工申请:', { name, phone, province, city });
    
    // 验证必要参数（只需要姓名、电话、省市、照片）
    if (!name || !phone || !province || !city || !storeImage) {
      return createErrorResponse('缺少必要参数');
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return createErrorResponse('手机号格式不正确');
    }
    
    // 获取申请人信息
    let applicantUser = null;
    if (userPhone) {
      const userResult = await db.collection('users').where({
        phone: userPhone,
        status: 'active'
      }).get();
      
      if (userResult.data && userResult.data.length > 0) {
        applicantUser = userResult.data[0];
      }
    } else if (userId) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.data) {
        applicantUser = userDoc.data;
      }
    }
    
    if (!applicantUser) {
      return createErrorResponse('申请人信息不存在');
    }
    
    // 检查是否已经是维修工或已有待审核的申请
    if (applicantUser.role === 'worker' || applicantUser.role === 'manager' || applicantUser.role === 'admin') {
      return createErrorResponse('您已经是维修工或管理员，无需申请');
    }
    
    // 检查是否有待审核的申请
    const existingApplicationResult = await db.collection('workerApplications').where({
      applicantId: applicantUser._id,
      status: 'pending'
    }).get();
    
    if (existingApplicationResult.data && existingApplicationResult.data.length > 0) {
      return createErrorResponse('您已有待审核的申请，请耐心等待');
    }
    
    // 生成申请ID
    const applicationId = 'APP_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // 创建申请记录
    const applicationData = {
      applicationId: applicationId,
      applicantId: applicantUser._id,
      applicantName: name,
      applicantPhone: phone,
      applicantOriginalPhone: userPhone || applicantUser.phone,
      province: province,
      city: city,
      storeName: storeName || '', // 可选
      address: address || '', // 可选
      storeImage: storeImage,
      experience: experience || '', // 可选
      status: 'pending', // pending, approved, rejected
      submitTime: new Date(),
      updateTime: new Date()
    };
    
    const result = await db.collection('workerApplications').add({
      data: applicationData
    });
    
    console.log('✅ 维修工申请提交成功, 申请ID:', applicationId);
    
    return createSuccessResponse({
      applicationId: applicationId,
      _id: result._id
    }, '申请提交成功，请等待审核');
    
  } catch (error) {
    console.error('❌ 提交维修工申请失败:', error);
    return createErrorResponse('提交申请失败: ' + error.message);
  }
}

/**
 * 获取维修工申请列表（主管）
 */
async function getWorkerApplications(event) {
  try {
    const { phoneNumber, status, page = 1, pageSize = 20 } = event;
    
    console.log('getWorkerApplications - 获取维修工申请列表:', { phoneNumber, status, page });
    
    // 验证主管权限
    const user = await validateUserPermission(event, []);
    
    if (user.role !== 'manager' && user.role !== 'admin') {
      // 尝试通过手机号查找主管账号
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data.length === 0) {
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        return createErrorResponse('权限不足：当前用户不是主管');
      }
    }
    
    // 构建查询条件
    const where = {};
    if (status && status !== 'all') {
      where.status = status;
    }
    
    // 查询总数
    const countResult = await db.collection('workerApplications')
      .where(where)
      .count();
    
    const total = countResult.total;
    
    // 查询数据
    const skip = (page - 1) * pageSize;
    const result = await db.collection('workerApplications')
      .where(where)
      .orderBy('submitTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    console.log('✅ 获取维修工申请列表成功, 数量:', result.data.length);
    
    return createSuccessResponse({
      data: result.data,
      total: total,
      page: page,
      pageSize: pageSize
    }, '获取申请列表成功');
    
  } catch (error) {
    console.error('❌ 获取维修工申请列表失败:', error);
    return createErrorResponse('获取申请列表失败: ' + error.message);
  }
}

/**
 * 批准维修工申请
 */
async function approveWorkerApplication(event) {
  try {
    const { applicationId, phoneNumber } = event;
    
    console.log('approveWorkerApplication - 批准维修工申请:', { applicationId, phoneNumber });
    
    // 验证参数
    if (!applicationId) {
      return createErrorResponse('缺少申请ID');
    }
    
    // 验证主管权限
    const user = await validateUserPermission(event, []);
    
    if (user.role !== 'manager' && user.role !== 'admin') {
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data.length === 0) {
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        return createErrorResponse('权限不足：当前用户不是主管');
      }
    }
    
    // 查询申请记录
    const applicationResult = await db.collection('workerApplications').where({
      applicationId: applicationId
    }).get();
    
    if (applicationResult.data.length === 0) {
      return createErrorResponse('申请记录不存在');
    }
    
    const application = applicationResult.data[0];
    
    if (application.status !== 'pending') {
      return createErrorResponse('该申请已处理，无法重复操作');
    }
    
    // 更新申请状态
    await db.collection('workerApplications').doc(application._id).update({
      data: {
        status: 'approved',
        approvedBy: user._id,
        approvedByName: user.nickname || user.name || user.phone,
        approvedTime: new Date(),
        updateTime: new Date()
      }
    });
    
    // 生成 region 字段（完整地区字符串）
    const region = `${application.province}${application.city}`;
    
    // 更新用户角色为维修工
    await db.collection('users').doc(application.applicantId).update({
      data: {
        role: 'worker',
        position: '维修工',
        province: application.province,
        city: application.city,
        region: region,  // 添加 region 字段
        storeName: application.storeName,
        storeAddress: application.address,
        storeImage: application.storeImage,
        experience: application.experience,
        registerTime: new Date(),  // 添加注册时间（审核通过即为正式注册）
        updateTime: new Date()
      }
    });
    
    console.log('✅ 维修工申请批准成功');
    
    // TODO: 发送通知给申请人
    
    return createSuccessResponse(null, '申请已批准');
    
  } catch (error) {
    console.error('❌ 批准维修工申请失败:', error);
    return createErrorResponse('批准申请失败: ' + error.message);
  }
}

/**
 * 拒绝维修工申请
 */
async function rejectWorkerApplication(event) {
  try {
    const { applicationId, reason, phoneNumber } = event;
    
    console.log('rejectWorkerApplication - 拒绝维修工申请:', { applicationId, reason, phoneNumber });
    
    // 验证参数
    if (!applicationId) {
      return createErrorResponse('缺少申请ID');
    }
    
    // 验证主管权限
    const user = await validateUserPermission(event, []);
    
    if (user.role !== 'manager' && user.role !== 'admin') {
      if (phoneNumber) {
        const managerResult = await db.collection('users').where({
          phone: phoneNumber,
          role: _.in(['manager', 'admin']),
          status: 'active'
        }).get();
        
        if (managerResult.data.length === 0) {
          return createErrorResponse('权限不足：当前用户不是主管');
        }
      } else {
        return createErrorResponse('权限不足：当前用户不是主管');
      }
    }
    
    // 查询申请记录
    const applicationResult = await db.collection('workerApplications').where({
      applicationId: applicationId
    }).get();
    
    if (applicationResult.data.length === 0) {
      return createErrorResponse('申请记录不存在');
    }
    
    const application = applicationResult.data[0];
    
    if (application.status !== 'pending') {
      return createErrorResponse('该申请已处理，无法重复操作');
    }
    
    // 更新申请状态
    await db.collection('workerApplications').doc(application._id).update({
      data: {
        status: 'rejected',
        rejectedBy: user._id,
        rejectedByName: user.nickname || user.name || user.phone,
        rejectedTime: new Date(),
        rejectReason: reason || '未通过审核',
        updateTime: new Date()
      }
    });
    
    console.log('✅ 维修工申请已拒绝');
    
    // TODO: 发送通知给申请人
    
    return createSuccessResponse(null, '申请已拒绝');
    
  } catch (error) {
    console.error('❌ 拒绝维修工申请失败:', error);
    return createErrorResponse('拒绝申请失败: ' + error.message);
  }
}

/**
 * 获取维修工列表
 */
async function getWorkerList(event) {
  try {
    const { province, city, keyword, pageNum = 1, pageSize = 20 } = event;
    
    console.log('getWorkerList - 开始获取维修工列表:', { province, city, keyword, pageNum, pageSize });
    
    // 构建查询条件 - 查询所有维修工
    let query = {
      role: 'worker'
    };
    
    // 地区筛选：支持 province/city 或 region 字段
    if (province || city) {
      const regionConditions = [];
      
      // 条件1：使用 province 和 city 字段查询
      const provinceCityQuery = { role: 'worker' };
      if (province) provinceCityQuery.province = province;
      if (city) provinceCityQuery.city = city;
      regionConditions.push(provinceCityQuery);
      
      // 条件2：使用 region 字段查询（支持"省-市"格式）
      if (province && city) {
        regionConditions.push({
          role: 'worker',
          region: db.RegExp({
            regexp: `^${province}-${city}`,
            options: 'i'
          })
        });
      } else if (province) {
        regionConditions.push({
          role: 'worker',
          region: db.RegExp({
            regexp: `^${province}`,
            options: 'i'
          })
        });
      }
      
      // 使用 OR 查询
      query = db.command.or(regionConditions);
    }
    
    // 关键词搜索（姓名、电话或地区）
    if (keyword) {
      const baseQuery = query.role ? query : { role: 'worker' };
      // 使用正则表达式进行模糊搜索
      query = db.command.and([
        baseQuery,
        db.command.or([
          {
            name: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          },
          {
            phone: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          },
          {
            region: db.RegExp({
              regexp: keyword,
              options: 'i'
            })
          }
        ])
      ]);
    }
    
    console.log('查询条件:', JSON.stringify(query, null, 2));
    
    // 查询总数
    const countResult = await db.collection('users').where(query).count();
    const total = countResult.total;
    
    console.log('符合条件的维修工总数:', total);
    
    // 分页查询
    const skip = (pageNum - 1) * pageSize;
    const workersResult = await db.collection('users')
      .where(query)
      .skip(skip)
      .limit(pageSize)
      .orderBy('registerTime', 'desc')
      .get();
    
    console.log('本页查询结果数:', workersResult.data.length);
    
    // 获取每个维修工的统计数据
    const workers = await Promise.all(workersResult.data.map(async (worker) => {
      // 查询该维修工已完成的工单数
      let completedCount = 0;
      try {
        const completedResult = await db.collection('issues')
          .where({
            assignedWorkerId: worker._id,  // 使用 _id 而不是 phone
            status: 'resolved'
          })
          .count();
        completedCount = completedResult.total || 0;
        console.log(`维修工 ${worker.name || worker.nickname} 已完成工单数:`, completedCount);
      } catch (error) {
        console.log('查询已完成工单数失败:', error.message);
        completedCount = 0;
      }
      
      // 查询该维修工处理中的工单数
      let processingCount = 0;
      try {
        const processingResult = await db.collection('issues')
          .where({
            assignedWorkerId: worker._id,  // 使用 _id 而不是 phone
            status: _.in(['assigned', 'in_progress', 'parts_requested', 'parts_sent', 'parts_received'])
          })
          .count();
        processingCount = processingResult.total || 0;
        console.log(`维修工 ${worker.name || worker.nickname} 处理中工单数:`, processingCount);
      } catch (error) {
        console.log('查询处理中工单数失败:', error.message);
        processingCount = 0;
      }
      
      // 获取平均评分 - 直接从 users 集合中读取
      let averageRating = '-';
      if (worker.averageRating && worker.averageRating > 0) {
        averageRating = worker.averageRating.toFixed(1);
      } else {
        // 如果 users 中没有，则从 issues 集合中实时计算
        try {
          const ratedIssues = await db.collection('issues')
            .where({
              assignedWorkerId: worker._id,
              status: 'resolved',
              satisfaction: _.gt(0)
            })
            .field({
              satisfaction: true
            })
            .get();
          
          if (ratedIssues.data.length > 0) {
            const totalRating = ratedIssues.data.reduce((sum, issue) => {
              return sum + (issue.satisfaction || 0);
            }, 0);
            averageRating = (totalRating / ratedIssues.data.length).toFixed(1);
          }
        } catch (error) {
          console.log('查询评分失败:', error.message);
          averageRating = '-';
        }
      }
      
      // 处理地区信息：优先使用 region 字段，否则拼接 province-city
      let region = worker.region || '';
      let province = worker.province || '未设置';
      let city = worker.city || '未设置';
      
      // 如果有 region 字段，从中提取省市信息
      if (region) {
        const parts = region.split('-');
        if (parts.length >= 2) {
          province = parts[0];
          city = parts[1];
        }
      } else if (province !== '未设置' && city !== '未设置') {
        // 如果没有 region 但有 province 和 city，则拼接
        region = `${province}-${city}`;
      }
      
      return {
        _id: worker._id,
        name: worker.name || worker.nickname || '未命名',
        phone: worker.phone,
        province: province,
        city: city,
        region: region,
        storeName: worker.storeName || '',
        address: worker.address || '',
        registerTime: worker.registerTime || worker.createTime,
        completedCount: completedCount,
        processingCount: processingCount,
        averageRating: averageRating
      };
    }));
    
    // 计算是否还有更多数据
    const hasMore = skip + workersResult.data.length < total;
    
    console.log('✅ 获取维修工列表成功:', {
      返回数量: workers.length,
      总数: total,
      是否有更多: hasMore
    });
    
    return createSuccessResponse({
      workers: workers,
      total: total,
      hasMore: hasMore,
      pageNum: pageNum,
      pageSize: pageSize
    }, '获取成功');
    
  } catch (error) {
    console.error('❌ 获取维修工列表失败:', error);
    return createErrorResponse('获取列表失败: ' + error.message);
  }
}

/**
 * 获取所有省份列表
 */
async function getWorkerProvinces(event) {
  try {
    console.log('getWorkerProvinces - 开始获取省份列表');
    
    // 查询所有已审核通过的维修工
    const result = await db.collection('users')
      .where({
        role: 'worker',
        province: _.neq('')
      })
      .field({
        province: true
      })
      .get();
    
    // 提取不重复的省份
    const provinces = [...new Set(result.data.map(item => item.province).filter(p => p))];
    provinces.sort();
    
    console.log('✅ 获取省份列表成功:', provinces.length, '个省份');
    
    return createSuccessResponse(provinces, '获取成功');
    
  } catch (error) {
    console.error('❌ 获取省份列表失败:', error);
    return createErrorResponse('获取省份列表失败: ' + error.message);
  }
}

/**
 * 获取指定省份的城市列表
 */
async function getWorkerCities(event) {
  try {
    const { province } = event;
    
    if (!province) {
      return createErrorResponse('缺少省份参数');
    }
    
    console.log('getWorkerCities - 开始获取城市列表，省份:', province);
    
    // 查询指定省份的所有已审核通过的维修工
    const result = await db.collection('users')
      .where({
        role: 'worker',
        province: province,
        city: _.neq('')
      })
      .field({
        city: true
      })
      .get();
    
    // 提取不重复的城市
    const cities = [...new Set(result.data.map(item => item.city).filter(c => c))];
    cities.sort();
    
    console.log('✅ 获取城市列表成功:', cities.length, '个城市');
    
    return createSuccessResponse(cities, '获取成功');
    
  } catch (error) {
    console.error('❌ 获取城市列表失败:', error);
    return createErrorResponse('获取城市列表失败: ' + error.message);
  }
}

/**
 * 修复维修工的审核状态（一键修复工具）
 * 给所有 role 为 worker 的用户添加 isApproved: true
 */
async function fixWorkerApprovalStatus(event) {
  try {
    console.log('🔧 开始修复维修工审核状态...');
    
    // 查询所有维修工
    const workersResult = await db.collection('users')
      .where({
        role: 'worker'
      })
      .get();
    
    console.log(`📊 找到 ${workersResult.data.length} 个维修工账号`);
    
    // 统计需要修复的
    let needFixCount = 0;
    const fixDetails = [];
    
    workersResult.data.forEach(worker => {
      const status = {
        name: worker.name || worker.nickname || '未命名',
        phone: worker.phone,
        hasIsApproved: worker.hasOwnProperty('isApproved'),
        isApprovedValue: worker.isApproved,
        needFix: !worker.isApproved
      };
      
      fixDetails.push(status);
      
      if (!worker.isApproved) {
        needFixCount++;
      }
    });
    
    console.log(`🔍 需要修复的维修工数量: ${needFixCount}`);
    
    // 批量更新所有维修工，添加 isApproved: true
    const updateResult = await db.collection('users')
      .where({
        role: 'worker'
      })
      .update({
        data: {
          isApproved: true
        }
      });
    
    console.log(`✅ 修复完成！更新了 ${updateResult.stats.updated} 条记录`);
    
    return createSuccessResponse({
      totalWorkers: workersResult.data.length,
      needFixCount: needFixCount,
      updatedCount: updateResult.stats.updated,
      details: fixDetails
    }, '修复成功');
    
  } catch (error) {
    console.error('❌ 修复维修工审核状态失败:', error);
    return createErrorResponse('修复失败: ' + error.message);
  }
}

/**
 * 获取维修工详细信息
 */
async function getWorkerDetail(event) {
  try {
    const { workerId } = event;
    
    console.log('📋 获取维修工详情 - workerId:', workerId);
    
    if (!workerId) {
      return createErrorResponse('缺少维修工ID');
    }
    
    // 查询维修工信息
    const workerResult = await db.collection('users')
      .doc(workerId)
      .get();
    
    if (!workerResult.data) {
      return createErrorResponse('维修工不存在');
    }
    
    const worker = workerResult.data;
    console.log('✅ 找到维修工:', worker.name || worker.nickname);
    
    // 查询已完成工单数
    let completedCount = 0;
    try {
      const completedResult = await db.collection('issues')
        .where({
          assignedWorkerId: worker._id,
          status: 'resolved'
        })
        .count();
      completedCount = completedResult.total || 0;
    } catch (error) {
      console.log('查询已完成工单数失败:', error.message);
    }
    
    // 查询处理中工单数
    let processingCount = 0;
    try {
      const processingResult = await db.collection('issues')
        .where({
          assignedWorkerId: worker._id,
          status: _.in(['assigned', 'in_progress', 'parts_requested', 'parts_sent', 'parts_received'])
        })
        .count();
      processingCount = processingResult.total || 0;
    } catch (error) {
      console.log('查询处理中工单数失败:', error.message);
    }
    
    // 获取平均评分 - 直接从 users 集合中读取
    let averageRating = '-';
    if (worker.averageRating && worker.averageRating > 0) {
      averageRating = worker.averageRating.toFixed(1);
    } else {
      // 如果 users 中没有，则从 issues 集合中实时计算
      try {
        const ratedIssues = await db.collection('issues')
          .where({
            assignedWorkerId: workerId,
            status: 'resolved',
            satisfaction: _.gt(0)
          })
          .field({
            satisfaction: true
          })
          .get();
        
        if (ratedIssues.data.length > 0) {
          const totalRating = ratedIssues.data.reduce((sum, issue) => {
            return sum + (issue.satisfaction || 0);
          }, 0);
          averageRating = (totalRating / ratedIssues.data.length).toFixed(1);
        }
      } catch (error) {
        console.log('查询评分失败:', error.message);
        averageRating = '-';
      }
    }
    
    // 处理地区信息：优先使用 region 字段，否则拼接 province-city
    let region = worker.region || '';
    let province = worker.province || '未设置';
    let city = worker.city || '未设置';
    
    // 如果有 region 字段，从中提取省市信息
    if (region) {
      const parts = region.split('-');
      if (parts.length >= 2) {
        province = parts[0];
        city = parts[1];
      }
    } else if (province !== '未设置' && city !== '未设置') {
      // 如果没有 region 但有 province 和 city，则拼接
      region = `${province}-${city}`;
    }
    
    const workerInfo = {
      _id: worker._id,
      name: worker.name || worker.nickname || '未命名',
      phone: worker.phone,
      province: province,
      city: city,
      region: region,
      storeName: worker.storeName || '',
      address: worker.address || '',
      registerTime: worker.registerTime || worker.createTime,
      completedCount: completedCount,
      processingCount: processingCount,
      averageRating: averageRating
    };
    
    console.log('✅ 获取维修工详情成功');
    return createSuccessResponse(workerInfo, '获取成功');
    
  } catch (error) {
    console.error('❌ 获取维修工详情失败:', error);
    return createErrorResponse('获取失败: ' + error.message);
  }
}

/**
 * 获取维修工的工单列表
 */
async function getWorkerIssues(event) {
  try {
    const { workerId, type, pageNum = 1, pageSize = 20 } = event;
    
    console.log('📋 获取维修工工单列表:', { workerId, type, pageNum, pageSize });
    
    if (!workerId) {
      return createErrorResponse('缺少维修工ID');
    }
    
    if (!type || !['completed', 'processing'].includes(type)) {
      return createErrorResponse('工单类型参数错误');
    }
    
    // 构建查询条件
    const where = {
      assignedWorkerId: workerId
    };
    
    if (type === 'completed') {
      where.status = 'resolved';
    } else {
      where.status = _.in(['assigned', 'in_progress', 'parts_requested', 'parts_sent', 'parts_received']);
    }
    
    // 计算分页
    const skip = (pageNum - 1) * pageSize;
    
    // 查询总数
    const countResult = await db.collection('issues')
      .where(where)
      .count();
    const total = countResult.total || 0;
    
    // 查询工单列表
    const issuesResult = await db.collection('issues')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    const hasMore = skip + issuesResult.data.length < total;
    
    console.log('✅ 获取工单列表成功:', issuesResult.data.length, '条，总数:', total);
    
    return createSuccessResponse({
      issues: issuesResult.data,
      total: total,
      hasMore: hasMore,
      pageNum: pageNum,
      pageSize: pageSize
    }, '获取成功');
    
  } catch (error) {
    console.error('❌ 获取工单列表失败:', error);
    return createErrorResponse('获取失败: ' + error.message);
  }
}

/**
 * 获取维修工的评分列表
 */
async function getWorkerRatings(event) {
  try {
    const { workerId, pageNum = 1, pageSize = 20 } = event;
    
    console.log('📋 获取维修工评分列表:', { workerId, pageNum, pageSize });
    
    if (!workerId) {
      return createErrorResponse('缺少维修工ID');
    }
    
    // 计算分页
    const skip = (pageNum - 1) * pageSize;
    
    // 查询总数 - 从 issues 集合中查询该维修工已完成且有评分的工单
    const countResult = await db.collection('issues')
      .where({
        assignedWorkerId: workerId,
        status: 'resolved',
        satisfaction: _.gt(0)  // satisfaction > 0
      })
      .count();
    const total = countResult.total || 0;
    
    // 查询评分列表 - 从 issues 集合中获取
    const ratingsResult = await db.collection('issues')
      .where({
        assignedWorkerId: workerId,
        status: 'resolved',
        satisfaction: _.gt(0)  // satisfaction > 0
      })
      .field({
        issueId: true,
        satisfaction: true,
        feedback: true,
        resolvedTime: true,
        createTime: true,
        description: true,
        projectType: true,
        clientId: true
      })
      .orderBy('resolvedTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();
    
    // 格式化数据，转换为评分列表格式
    const ratings = ratingsResult.data.map(issue => ({
      _id: issue._id,
      issueId: issue.issueId,
      rating: issue.satisfaction,  // 将 satisfaction 映射为 rating
      comment: issue.feedback || '',  // 将 feedback 映射为 comment
      tags: [],  // issues 中没有 tags 字段，返回空数组
      createTime: issue.resolvedTime || issue.createTime,  // 使用完成时间作为评价时间
      description: issue.description,
      projectType: issue.projectType
    }));
    
    const hasMore = skip + ratings.length < total;
    
    console.log('✅ 获取评分列表成功:', ratings.length, '条，总数:', total);
    
    return createSuccessResponse({
      ratings: ratings,
      total: total,
      hasMore: hasMore,
      pageNum: pageNum,
      pageSize: pageSize
    }, '获取成功');
    
  } catch (error) {
    console.error('❌ 获取评分列表失败:', error);
    return createErrorResponse('获取失败: ' + error.message);
  }
}

/**
 * 逆地理编码 - 将经纬度转换为真实地址
 * 使用腾讯位置服务API
 */
/**
 * 备用地址解析方案（基于经纬度范围判断）
 */
function getFallbackAddress(latitude, longitude) {
  // 中国主要城市的经纬度范围
  const cityRanges = [
    // 直辖市
    { name: '北京市', province: '北京市', lat: [39.4, 41.1], lng: [115.4, 117.5] },
    { name: '上海市', province: '上海市', lat: [30.7, 31.5], lng: [120.9, 122.0] },
    { name: '天津市', province: '天津市', lat: [38.6, 40.3], lng: [116.7, 118.1] },
    { name: '重庆市', province: '重庆市', lat: [28.1, 32.2], lng: [105.3, 110.2] },
    
    // 省会城市
    { name: '广州市', province: '广东省', lat: [22.5, 23.9], lng: [112.9, 114.0] },
    { name: '深圳市', province: '广东省', lat: [22.4, 22.9], lng: [113.7, 114.6] },
    { name: '成都市', province: '四川省', lat: [30.1, 31.4], lng: [102.9, 104.9] },
    { name: '杭州市', province: '浙江省', lat: [29.2, 30.6], lng: [118.3, 120.9] },
    { name: '武汉市', province: '湖北省', lat: [29.9, 31.4], lng: [113.7, 115.1] },
    { name: '西安市', province: '陕西省', lat: [33.7, 34.8], lng: [107.7, 109.8] },
    { name: '郑州市', province: '河南省', lat: [34.2, 35.0], lng: [112.9, 114.4] },
    { name: '南京市', province: '江苏省', lat: [31.2, 32.6], lng: [118.4, 119.2] },
    { name: '济南市', province: '山东省', lat: [36.0, 37.0], lng: [116.4, 117.7] },
    { name: '沈阳市', province: '辽宁省', lat: [41.1, 42.0], lng: [122.3, 123.8] },
    { name: '长春市', province: '吉林省', lat: [43.5, 44.2], lng: [124.8, 126.0] },
    { name: '哈尔滨市', province: '黑龙江省', lat: [44.9, 46.1], lng: [126.1, 127.2] },
    { name: '昆明市', province: '云南省', lat: [24.3, 25.5], lng: [102.1, 103.4] },
    { name: '兰州市', province: '甘肃省', lat: [35.8, 36.4], lng: [102.9, 104.3] },
    { name: '南宁市', province: '广西壮族自治区', lat: [22.4, 23.4], lng: [107.8, 109.0] },
    { name: '合肥市', province: '安徽省', lat: [31.3, 32.1], lng: [116.7, 117.9] },
    { name: '长沙市', province: '湖南省', lat: [27.8, 28.5], lng: [112.3, 113.4] },
    { name: '福州市', province: '福建省', lat: [25.6, 26.4], lng: [118.8, 119.7] },
    { name: '南昌市', province: '江西省', lat: [28.3, 29.0], lng: [115.5, 116.2] },
    { name: '石家庄市', province: '河北省', lat: [37.6, 38.5], lng: [114.1, 115.2] },
    { name: '太原市', province: '山西省', lat: [37.5, 38.2], lng: [112.2, 113.0] },
    { name: '贵阳市', province: '贵州省', lat: [26.1, 27.0], lng: [106.2, 107.2] },
    { name: '海口市', province: '海南省', lat: [19.8, 20.3], lng: [110.0, 110.6] },
    { name: '拉萨市', province: '西藏自治区', lat: [29.4, 30.2], lng: [90.6, 91.8] },
    { name: '银川市', province: '宁夏回族自治区', lat: [38.0, 38.7], lng: [105.8, 106.6] },
    { name: '西宁市', province: '青海省', lat: [36.3, 37.0], lng: [101.3, 102.2] },
    { name: '乌鲁木齐市', province: '新疆维吾尔自治区', lat: [43.3, 44.2], lng: [86.8, 88.2] },
    { name: '呼和浩特市', province: '内蒙古自治区', lat: [40.4, 41.2], lng: [110.8, 112.2] }
  ];
  
  // 尝试匹配城市
  for (const city of cityRanges) {
    if (latitude >= city.lat[0] && latitude <= city.lat[1] &&
        longitude >= city.lng[0] && longitude <= city.lng[1]) {
      return {
        address: `${city.province}${city.name}`,
        region: `${city.province}-${city.name}-未知区域`,
        province: city.province,
        city: city.name,
        district: '未知区域',
        formattedAddress: `${city.province}${city.name}`
      };
    }
  }
  
  // 如果没有匹配到，返回"中国大陆"
  return {
    address: '中国大陆',
    region: '中国-未知省份-未知城市',
    province: '中国',
    city: '未知省份',
    district: '未知城市',
    formattedAddress: '中国大陆'
  };
}

async function reverseGeocode(event) {
  try {
    const { latitude, longitude } = event;
    
    console.log('🔍 开始逆地理编码:', { latitude, longitude });
    
    if (!latitude || !longitude) {
      return createErrorResponse('缺少经纬度参数');
    }
    
    // 腾讯位置服务API Key
    // 注意：这是开发者密钥，请替换为您自己的密钥
    // 申请地址：https://lbs.qq.com/
    // const TENCENT_MAP_KEY = 'IGZBZ-HC26T-DQJXV-V5DXW-RTVRS-4MFWE'; // 腾讯地图 Key
    const GD_MAP_KEY = ''
    
    // 构建API请求URL
    // const url = `https://apis.map.qq.com/ws/geocoder/v1/?location=${latitude},${longitude}&key=${TENCENT_MAP_KEY}&get_poi=0`;
    const url = 'https://restapi.amap.com/v3/geocode/regeo?output=xml&location=116.310003,39.991957&key=<用户的key>&radius=1000&extensions=all'
    
    console.log('📡 请求腾讯地图API:', url);
    
    // 使用云开发的HTTP API
    const result = await cloud.HTTPClient.request({
      url: url,
      method: 'GET'
    });
    
    console.log('📥 API响应状态:', result.status);
    
    // 解析响应数据
    let responseData;
    if (typeof result.data === 'string') {
      responseData = JSON.parse(result.data);
    } else {
      responseData = result.data;
    }
    
    console.log('📥 API响应数据:', JSON.stringify(responseData));
    
    if (result.status === 200 && responseData.status === 0) {
      const addressData = responseData.result;
      const address = addressData.address;
      const adInfo = addressData.ad_info;
      
      // 构建详细地址信息（不包含经纬度）
      const locationInfo = {
        address: address,  // 完整地址
        region: `${adInfo.province}-${adInfo.city}-${adInfo.district}`,  // 区域字符串（省-市-区）
        province: adInfo.province,  // 省份
        city: adInfo.city,  // 城市
        district: adInfo.district,  // 区县
        formattedAddress: `${adInfo.province}${adInfo.city}${adInfo.district}`  // 格式化地址
      };
      
      console.log('✅ 地址解析成功:', locationInfo.address);
      
      return createSuccessResponse(locationInfo, '地址解析成功');
    } else {
      console.error('❌ 腾讯地图API返回错误:', responseData);
      // 返回降级方案：使用简化地址（不包含经纬度）
      const fallbackAddress = getFallbackAddress(latitude, longitude);
      return createSuccessResponse({
        address: fallbackAddress.address,
        region: fallbackAddress.region,
        province: fallbackAddress.province,
        city: fallbackAddress.city,
        district: fallbackAddress.district,
        formattedAddress: fallbackAddress.formattedAddress,
        fallback: true
      }, '使用备用方案解析地址');
    }
  } catch (error) {
    console.error('❌ 逆地理编码失败:', error);
    console.error('❌ 错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // 返回降级方案：使用简化地址（不包含经纬度）
    const { latitude, longitude } = event;
    const fallbackAddress = getFallbackAddress(latitude, longitude);
    return createSuccessResponse({
      address: fallbackAddress.address,
      region: fallbackAddress.region,
      province: fallbackAddress.province,
      city: fallbackAddress.city,
      district: fallbackAddress.district,
      formattedAddress: fallbackAddress.formattedAddress,
      fallback: true,
      error: error.message
    }, '使用备用方案解析地址: ' + error.message);
  }
}

