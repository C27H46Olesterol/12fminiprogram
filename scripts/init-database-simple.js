// 简单的数据库初始化脚本
// 在微信开发者工具的控制台中运行

console.log('正在初始化数据库集合...');

wx.cloud.callFunction({
  name: 'issues',
  data: {
    action: 'initDatabase'
  }
}).then(result => {
  console.log('初始化结果:', result.result);
  if (result.result.success) {
    console.log('✅ 数据库初始化成功！');
    console.log('现在可以正常使用反馈功能了');
  } else {
    console.error('❌ 数据库初始化失败:', result.result.message);
  }
}).catch(error => {
  console.error('❌ 调用云函数失败:', error);
});






