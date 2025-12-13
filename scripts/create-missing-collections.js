// 创建缺失的数据库集合
// 在微信开发者工具控制台中运行

console.log('🚀 开始创建缺失的数据库集合...');

const db = wx.cloud.database();

// 需要创建的集合配置
const collectionsToCreate = [
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

// 创建集合的函数
async function createCollection(collectionConfig) {
  try {
    console.log(`🔧 正在创建 ${collectionConfig.name} 集合...`);
    
    // 先检查集合是否已存在
    const count = await db.collection(collectionConfig.name).count();
    console.log(`✅ ${collectionConfig.name} 集合已存在，文档数量: ${count.total}`);
    return true;
  } catch (error) {
    if (error.errCode === -502005) {
      console.log(`❌ ${collectionConfig.name} 集合不存在，正在创建...`);
      
      try {
        // 创建集合并插入初始文档
        const result = await db.collection(collectionConfig.name).add({
          data: collectionConfig.initDoc
        });
        console.log(`✅ ${collectionConfig.name} 集合创建成功，文档ID: ${result._id}`);
        return true;
      } catch (createError) {
        console.log(`❌ ${collectionConfig.name} 集合创建失败:`, createError);
        return false;
      }
    } else {
      console.log(`❌ 检查 ${collectionConfig.name} 集合时出错:`, error);
      return false;
    }
  }
}

// 逐个创建集合
async function createAllCollections() {
  console.log('📋 开始创建所有缺失的集合...');
  
  for (const collection of collectionsToCreate) {
    await createCollection(collection);
    // 添加延迟避免请求过快
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('🎉 集合创建完成！');
  
  // 验证所有集合
  console.log('\n🔍 验证所有集合状态...');
  const allCollections = ['issues', 'users', 'issueStatusHistory', 'technicians'];
  
  for (const collectionName of allCollections) {
    try {
      const count = await db.collection(collectionName).count();
      console.log(`✅ ${collectionName}: ${count.total} 个文档`);
    } catch (error) {
      console.log(`❌ ${collectionName}: 不存在或访问失败`);
    }
  }
}

// 执行创建
createAllCollections().then(() => {
  console.log('\n🚀 现在可以重新测试云函数了！');
}).catch(error => {
  console.error('❌ 创建集合过程中出错:', error);
});




