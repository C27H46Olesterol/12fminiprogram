// 初始化数据库集合脚本
// 在开发者工具的云函数控制台中运行此脚本

console.log('开始初始化数据库集合...');

const actions = ['issues', 'users', 'issueStatusHistory'];
const initDocs = {
  issues: {
    _id: 'init_issue',
    issueId: 'INIT_' + Date.now(),
    title: '系统初始化文档',
    description: '用于创建issues集合的初始化文档',
    category: '系统',
    priority: 'low',
    status: 'resolved',
    clientId: 'system',
    clientName: '系统管理员',
    createTime: new Date(),
    updateTime: new Date()
  },
  users: {
    _id: 'init_user',
    _openid: 'system_init_' + Date.now().toString(),
    role: 'admin',
    nickname: '系统管理员',
    phone: '00000000000',
    createTime: new Date(),
    updateTime: new Date()
  },
  issueStatusHistory: {
    _id: 'init_history',
    issueId: 'INIT_' + Date.now(),
    status: 'created',
    operatorId: 'system',
    operatorName: '系统管理员',
    remark: '初始化历史记录',
    createTime: new Date()
  }
};

actions.forEach(async (action, index) => {
  console.log(`执行action: ${action}`);
  
  try {
    // 调用云函数
    const result = await wx.cloud.callFunction({
      name: 'issues',
      data: { 
        action: 'ensureCollectionsExist',
        collectionName: action,
        initDoc: initDocs[action]
      }
    });
    
    console.log(`${action} 初始化结果:`, result.result);
  } catch (error) {
    console.error(`${action} 初始化失败:`, error);
  }
  
  // 每个操作间隔1秒
  if (index < actions.length - 1) {
    setTimeout(() => {}, 1000);
  }
});

console.log('数据库初始化完成');






