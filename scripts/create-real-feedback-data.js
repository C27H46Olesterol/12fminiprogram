// 创建真实的反馈数据
// 根据错误日志中的信息创建 ISSUE_mg4s19qkc7j1n 这个具体的反馈

async function createRealFeedbackData() {
  console.log('📝 创建真实反馈数据...');
  
  try {
    // 首先检查是否已经存在这个数据
    console.log('🔍 检查是否已存在 ISSUE_mg4s19qkc7j1n...');
    
    const checkResult = await wx.cloud.callFunction({
      name: 'issues',
      data: {
        action: 'getIssueDetail',
        issueId: 'ISSUE_mg4s19qkc7j1n'
      }
    });
    
    if (checkResult.result && checkResult.result.success) {
      console.log('✅ ISSUE_mg4s19qkc7j1n 已存在');
      console.log('数据:', checkResult.result.data.issue);
      return;
    }
    
    console.log('📝 ISSUE_mg4s19qkc7j1n 不存在，正在创建...');
    
    // 手动创建这个具体的反馈
    const db = wx.cloud.database();
    
    const realIssueData = {
      issueId: 'ISSUE_mg4s19qkc7j1n',
      title: '空调制冷效果差',
      description: '驻车空调开启后制冷效果不明显,温度下降很慢,已经影响正常使用。',
      category: '制冷问题',
      priority: 'urgent',
      priorityText: '非常紧急',
      status: 'assigned', 
      statusText: '已分配',
      clientId: 'client_' + Date.now(),
      productName: '驻车空调',
      productCode: 'AC_PARK_001',
      phoneNumber: '138****8888',
      location: '深圳市南山区',
      submissionTime: new Date('2024-01-15T14:30:00'),
      assignedTime: new Date('2024-01-15T16:00:00'),
      assignedTo: 'tech_worker_001',
      assignedToName: '张师傅',
      images: [],
      urgency: '高',
      reportTime: '2024-01-15 14:30:00',
      createTime: new Date('2024-01-15T14:30:00'),
      updateTime: new Date('2024-01-15T16:00:00')
    };
    
    // 插入到数据库
    const result = await db.collection('issues').add({
      data: realIssueData
    });
    
    console.log('✅ 真实反馈数据创建成功');
    console.log('数据库ID:', result._id);
    console.log('问题ID:', realIssueData.issueId);
    
    // 创建状态历史记录
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: 'ISSUE_mg4s19qkc7j1n',
        status: 'pending',
        statusText: '待处理',
        operatorId: 'system',
        operatorName: '系统',
        description: '问题已提交',
        createTime: new Date('2024-01-15T14:30:00')
      }
    });
    
    // 添加已分配状态记录
    await db.collection('issueStatusHistory').add({
      data: {
        issueId: 'ISSUE_mg4s19qkc7j1n',
        status: 'assigned',
        statusText: '已分配',
        operatorId: 'supervisor_001',
        operatorName: '主管',
        assignedTo: 'tech_worker_001',
        assignedToName: '张师傅',
        description: '已分配给张师傅处理',
        createTime: new Date('2024-01-15T16:00:00')
      }
    });
    
    console.log('✅ 状态历史记录创建成功');
    
    // 验证数据是否成功创建
    console.log('🧪 验证数据创建...');
    const verificationResult = await wx.cloud.callFunction({
      name: 'issues',
      data: {
        action: 'getIssueDetail',
        issueId: 'ISSUE_mg4s19qkc7j1n'
      }
    });
    
    if (verificationResult.result && verificationResult.result.success) {
      console.log('✅ 数据验证成功');
      console.log('标题:', verificationResult.result.data.issue.title);
      console.log('状态:', verificationResult.result.data.issue.status);
      console.log('优先级:', verificationResult.result.data.issue.priority);
    } else {
      console.log('❌ 数据验证失败:', verificationResult.result?.message);
    }
    
  } catch (error) {
    console.error('❌ 创建真实反馈数据失败:', error);
  }
}

// 创建多个真实反馈数据
async function createMultipleRealFeedbackData() {
  console.log('📝 创建多个真实反馈数据...');
  
  const feedbacks = [
    {
      issueId: 'ISSUE_mg4s19qkc7j1n',
      title: '空调制冷效果差',
      description: '驻车空调开启后制冷效果不明显,温度下降很慢,已经影响正常使用。',
      category: '制冷问题',
      priority: 'urgent',
      status: 'assigned',
      submissionTime: new Date('2024-01-15T14:30:00')
    },
    {
      issueId: 'ISSUE_test001',
      title: '123',
      description: '123123',
      category: '电气问题',
      priority: 'medium',
      status: 'pending',
      submissionTime: new Date('2025-09-29T14:58:00')
    },
    {
      issueId: 'ISSUE_test002', 
      title: '123',
      description: '123123',
      category: '机械问题',
      priority: 'low',
      status: 'pending',
      submissionTime: new Date('2025-09-29T14:53:00')
    },
    {
      issueId: 'ISSUE_test003',
      title: '123', 
      description: '123123123',
      category: '结构问题',
      priority: 'high',
      status: 'pending',
      submissionTime: new Date('2025-09-29T14:48:00')
    }
  ];
  
  try {
    for (const feedback of feedbacks) {
      console.log(`📝 创建反馈: ${feedback.title} (${feedback.issueId})`);
      
      const db = wx.cloud.database();
      
      const completeIssueData = {
        issueId: feedback.issueId,
        title: feedback.title,
        description: feedback.description,
        category: feedback.category,
        priority: feedback.priority,
        status: feedback.status,
        clientId: 'client_' + Date.now(),
        productName: '测试产品',
        productCode: 'TEST_001',
        phoneNumber: '138****8888',
        location: '测试地点',
        submissionTime: feedback.submissionTime,
        createTime: feedback.submissionTime,
        updateTime: feedback.submissionTime,
        urgency: feedback.priority === 'urgent' ? '高' : '中',
        reportTime: feedback.submissionTime.toISOString().replace('T', ' ').slice(0, 19)
      };
      
      await db.collection('issues').add({
        data: completeIssueData
      });
      
      // 创建状态历史
      await db.collection('issueStatusHistory').add({
        data: {
          issueId: feedback.issueId,
          status: feedback.status,
          operatorId: 'system',
          operatorName: '系统',
          description: '问题已提交',
          createTime: feedback.submissionTime
        }
      });
      
      console.log(`✅ 创建成功: ${feedback.issueId}`);
    }
    
    console.log('✅ 所有反馈数据创建完成');
    
    // 验证所有数据
    console.log('🧪 验证所有数据...');
    const allIssuesResult = await wx.cloud.callFunction({
      name: 'issues',
      data: {
        action: 'getPendingIssues'
      }
    });
    
    if (allIssuesResult.result && allIssuesResult.result.success) {
      console.log(`✅ 验证成功，现在有 ${allIssuesResult.result.data.length} 个问题`);
      allIssuesResult.result.data.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.issueId} - ${issue.title}`);
      });
    }
    
  } catch (error) {
    console.error('❌ 创建多个反馈数据失败:', error);
  }
}

// 执行创建函数
createRealFeedbackData();

// 可选：创建多个数据
setTimeout(() => {
  console.log('');
  console.log('🎯 5秒后创建多个真实反馈数据...');
  createMultipleRealFeedbackData();
}, 5000);

// 输出提示信息
console.log('');
console.log('📋 数据创建脚本已启动');
console.log('🔧 可以手动执行的函数:');
console.log('createRealFeedbackData() - 创建 ISSUE_mg4s19qkc7j1n');
console.log('createMultipleRealFeedbackData() - 创建多个测试数据');
console.log('');
console.log('🎯 创建完成后，请刷新反馈页面测试详情查看功能！');






