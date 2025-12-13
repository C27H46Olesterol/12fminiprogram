// 创建测试数据的脚本
// 在微信开发者工具的控制台中运行

console.log('正在创建测试数据...');

// 创建一些测试的issues
const testIssues = [
  {
    issueId: 'ISSUE_mg4rvhyxpgaek',
    title: '空调制冷效果差',
    description: '驻车空调开启后制冷效果不明显，温度下降很慢，已经影响正常使用。',
    category: '制冷问题',
    priority: 'high',
    status: 'assigned',
    clientId: 'test_client_001',
    clientName: '张先生',
    clientPhone: '13812345678',
    clientAddress: '北京市朝阳区',
    productModel: 'LT-A30',
    assignedWorkerId: 'worker_001',
    assignedWorkerName: '王师傅',
    createTime: new Date(),
    updateTime: new Date()
  },
  {
    issueId: 'ISSUE_mg4q3iwqh7ds6',
    title: '空调异响问题',
    description: '空调运行时出现异常噪音，影响休息，特别是在夜间。',
    category: '噪音问题',
    priority: 'medium',
    status: 'resolved',
    clientId: 'test_client_001',
    clientName: '张先生',
    clientPhone: '13812345678',
    clientAddress: '北京市朝阳区',
    productModel: 'LT-A30',
    assignedWorkerId: 'worker_002',
    assignedWorkerName: '李师傅',
    resolvedTime: new Date(),
    createTime: new Date(),
    updateTime: new Date()
  }
];

async function createTestData() {
  for (const issue of testIssues) {
    try {
      console.log(`创建issue: ${issue.title}`);
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'createTestIssue',
          issueData: issue
        }
      });
      
      console.log('创建结果:', result.result);
    } catch (error) {
      console.error('创建失败:', error);
    }
  }
}

createTestData();






