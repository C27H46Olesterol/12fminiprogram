// 手动创建数据库集合
// 在微信开发者工具控制台中运行

console.log('🔧 开始创建数据库集合...');

const db = wx.cloud.database();

// 创建issues集合
async function createIssuesCollection() {
  try {
    console.log('📝 创建issues集合...');
    
    // 添加测试数据来创建集合
    const result = await db.collection('issues').add({
      data: {
        issueId: 'INIT_' + Date.now(),
        title: '初始化问题',
        description: '用于初始化issues集合',
        status: 'pending',
        priority: 'medium',
        category: '系统',
        createTime: new Date(),
        updateTime: new Date(),
        reporterName: '系统',
        reporterPhone: '13800138000'
      }
    });
    
    console.log('✅ issues集合创建成功，文档ID:', result._id);
    
    // 验证集合
    const count = await db.collection('issues').count();
    console.log('✅ issues集合文档数量:', count.total);
    
    return true;
  } catch (error) {
    console.error('❌ issues集合创建失败:', error);
    return false;
  }
}

// 创建users集合
async function createUsersCollection() {
  try {
    console.log('👥 创建users集合...');
    
    const result = await db.collection('users').add({
      data: {
        phoneNumber: '13800138000',
        name: '主管',
        role: 'manager',
        department: '管理部',
        createTime: new Date(),
        updateTime: new Date()
      }
    });
    
    console.log('✅ users集合创建成功，文档ID:', result._id);
    
    const count = await db.collection('users').count();
    console.log('✅ users集合文档数量:', count.total);
    
    return true;
  } catch (error) {
    console.error('❌ users集合创建失败:', error);
    return false;
  }
}

// 创建notifications集合
async function createNotificationsCollection() {
  try {
    console.log('🔔 创建notifications集合...');
    
    const result = await db.collection('notifications').add({
      data: {
        title: '系统通知',
        content: '数据库初始化完成',
        type: 'system',
        createTime: new Date(),
        read: false
      }
    });
    
    console.log('✅ notifications集合创建成功，文档ID:', result._id);
    
    const count = await db.collection('notifications').count();
    console.log('✅ notifications集合文档数量:', count.total);
    
    return true;
  } catch (error) {
    console.error('❌ notifications集合创建失败:', error);
    return false;
  }
}

// 创建statistics集合
async function createStatisticsCollection() {
  try {
    console.log('📊 创建statistics集合...');
    
    const result = await db.collection('statistics').add({
      data: {
        date: new Date().toISOString().split('T')[0],
        totalIssues: 0,
        pendingIssues: 0,
        resolvedIssues: 0,
        createTime: new Date()
      }
    });
    
    console.log('✅ statistics集合创建成功，文档ID:', result._id);
    
    const count = await db.collection('statistics').count();
    console.log('✅ statistics集合文档数量:', count.total);
    
    return true;
  } catch (error) {
    console.error('❌ statistics集合创建失败:', error);
    return false;
  }
}

// 执行所有集合创建
async function createAllCollections() {
  console.log('🚀 开始创建所有数据库集合...');
  
  const results = await Promise.allSettled([
    createIssuesCollection(),
    createUsersCollection(),
    createNotificationsCollection(),
    createStatisticsCollection()
  ]);
  
  console.log('\n📋 创建结果汇总:');
  results.forEach((result, index) => {
    const collectionNames = ['issues', 'users', 'notifications', 'statistics'];
    if (result.status === 'fulfilled' && result.value) {
      console.log(`✅ ${collectionNames[index]}集合创建成功`);
    } else {
      console.log(`❌ ${collectionNames[index]}集合创建失败`);
    }
  });
  
  // 最终验证
  console.log('\n🔍 最终验证集合状态...');
  try {
    const collections = await db.listCollections();
    console.log('✅ 当前集合列表:', collections);
  } catch (error) {
    console.error('❌ 获取集合列表失败:', error);
  }
}

// 运行创建函数
createAllCollections().then(() => {
  console.log('\n🎉 集合创建完成！');
}).catch(error => {
  console.error('❌ 集合创建过程失败:', error);
});




