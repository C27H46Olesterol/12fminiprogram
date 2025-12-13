// 手动创建集合的指导脚本
// 由于微信云开发限制，需要通过控制台手动创建集合

console.log('📋 微信云开发集合创建指导');
console.log('=====================================');
console.log('');
console.log('❌ 问题：微信云开发不允许通过代码直接创建集合');
console.log('✅ 解决方案：需要在云开发控制台手动创建');
console.log('');
console.log('🔧 操作步骤：');
console.log('1. 打开微信开发者工具');
console.log('2. 点击 "云开发" 按钮');
console.log('3. 进入 "数据库" 页面');
console.log('4. 点击 "新建集合" 按钮');
console.log('5. 创建以下两个集合：');
console.log('');
console.log('   集合名称: issueStatusHistory');
console.log('   描述: 问题状态历史记录');
console.log('');
console.log('   集合名称: technicians');
console.log('   描述: 技术人员信息');
console.log('');
console.log('6. 创建完成后，运行测试脚本验证');
console.log('');
console.log('💡 提示：集合创建后会自动生成 _id 字段，无需手动添加');
console.log('');

// 验证当前集合状态
console.log('🔍 当前集合状态检查...');
const db = wx.cloud.database();

async function checkCollections() {
  const collections = ['issues', 'users', 'issueStatusHistory', 'technicians'];
  
  for (const collectionName of collections) {
    try {
      const count = await db.collection(collectionName).count();
      console.log(`✅ ${collectionName}: ${count.total} 个文档`);
    } catch (error) {
      if (error.errCode === -502005) {
        console.log(`❌ ${collectionName}: 集合不存在，需要手动创建`);
      } else {
        console.log(`❌ ${collectionName}: 访问失败 - ${error.message}`);
      }
    }
  }
  
  console.log('');
  console.log('📝 如果所有集合都存在，可以运行以下代码测试云函数：');
  console.log(`
// 测试云函数
wx.cloud.callFunction({
  name: 'manager-overview',
  data: {
    action: 'getOverview',
    phoneNumber: '13800138000'
  }
}).then(result => {
  console.log('✅ 云函数调用结果:', result);
  if (result.result && result.result.success) {
    console.log('🎉 数据获取成功！');
    console.log('📊 概览数据:', result.result.data);
  } else {
    console.log('❌ 数据获取失败:', result.result);
  }
}).catch(error => {
  console.error('❌ 云函数调用失败:', error);
});
  `);
}

checkCollections();




