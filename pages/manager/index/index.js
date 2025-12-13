// pages/manager/index/index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    overviewData: {
      pending: 0,
      assigned: 0,
      resolved: 0,
      pendingRatings: 0  // 待评价工单数量
    },
    urgentIssues: [],
    recentIssues: []
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.loadOverviewData();
  },

  // 初始化页面
  initPage() {
    const userInfo = app.globalData.userInfo;
    if (!userInfo) {
      app.logout();
      return;
    }
    
    this.setData({ userInfo });
  },

  // 加载概览数据
  async loadOverviewData() {
    try {
      app.showLoading('加载中...');
      
      console.log('📊 开始加载主管概览数据...');
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      console.log('📱 当前用户手机号:', phoneNumber);
      
      // 调用云函数获取真实数据
      const result = await wx.cloud.callFunction({
        name: 'manager-overview',
        data: {
          action: 'getOverview',
          phoneNumber: phoneNumber
        }
      });

      console.log('📊 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取真实数据:', data);
        
        this.setData({
          overviewData: data.overview,
          urgentIssues: data.urgentIssues,
          recentIssues: data.recentIssues
        });
        
        console.log('📊 数据显示状态:');
        console.log('  待处理:', data.overview.pending, '个');
        console.log('  已分配:', data.overview.assigned, '个');
        console.log('  已解决:', data.overview.resolved, '个');
        console.log('  紧急问题:', data.urgentIssues.length, '个');
        console.log('  最近处理:', data.recentIssues.length, '个');
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        // 失败时使用模拟数据作为备用
        await this.loadFallbackData();
      }
      
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      console.log('🔄 尝试使用备用数据...');
      // 出错时使用模拟数据作为备用
      await this.loadFallbackData();
    } finally {
      app.hideLoading();
    }
  },

  // 备用数据（当云函数调用失败时）
  async loadFallbackData() {
    console.log('🔄 使用备用模拟数据...');
    const data = await this.mockGetOverviewData();
    
    this.setData({
      overviewData: data.overview,
      urgentIssues: data.urgentIssues,
      recentIssues: data.recentIssues
    });
  },

  // 模拟获取概览数据（备用）
  mockGetOverviewData() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          overview: {
            pending: 8,
            assigned: 12,
            resolved: 45,
            pendingRatings: 3  // 待评价工单数量
          },
          urgentIssues: [
            {
              id: 'FB001',
              title: '空调制冷效果差',
              description: '驻车空调开启后制冷效果不明显，温度下降很慢',
              createTime: '2024-01-15 14:30'
            },
            {
              id: 'FB003',
              title: '空调无法启动',
              description: '按下开关后空调没有任何反应，指示灯也不亮',
              createTime: '2024-01-16 08:45'
            }
          ],
          recentIssues: [
            {
              id: 'FB002',
              title: '空调异响问题',
              status: 'resolved',
              statusText: '已解决',
              assignee: '李师傅',
              updateTime: '2024-01-12 10:30'
            },
            {
              id: 'FB004',
              title: '温度控制不准确',
              status: 'assigned',
              statusText: '已分配',
              assignee: '张师傅',
              updateTime: '2024-01-15 09:10'
            }
          ]
        });
      }, 1000);
    });
  },

  // 跳转到待处理问题
  onGoPending() {
    wx.navigateTo({
      url: '/pages/manager/pending/pending'
    });
  },

  // 跳转到已分配列表
  onGoAssigned() {
    wx.navigateTo({
      url: '/pages/manager/assigned/assigned'
    });
  },

  // 跳转到已解决列表
  onGoResolved() {
    wx.navigateTo({
      url: '/pages/manager/resolved/resolved'
    });
  },

  // 跳转到数据统计
  onGoStatistics() {
    wx.navigateTo({
      url: '/pages/manager/statistics/statistics'
    });
  },

  // 跳转到问题反馈
  onGoFeedback() {
    wx.navigateTo({
      url: '/pages/manager/feedback/feedback'
    });
  },

  // 跳转到评分反馈
  onGoRatingFeedback() {
    wx.navigateTo({
      url: '/pages/manager/rating-feedback/rating-feedback'
    });
  },

  // 跳转到维修工申请管理
  onGoWorkerApplications() {
    wx.navigateTo({
      url: '/pages/manager/worker-applications/worker-applications'
    });
  },

  // 跳转到维修工列表
  onGoWorkerList() {
    wx.navigateTo({
      url: '/pages/manager/personnel-manager/personnel-manager'
    });
  },

  // 查看紧急问题
  onViewUrgentIssue(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/pending/pending?id=${issueId}`
    });
  },

  // 查看最近处理问题
  onViewRecentIssue(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/assigned/assigned?id=${issueId}`
    });
  },

  // 查看全部最近处理
  onViewAllRecent() {
    wx.navigateTo({
      url: '/pages/manager/assigned/assigned'
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadOverviewData();
    wx.stopPullDownRefresh();
  }
});