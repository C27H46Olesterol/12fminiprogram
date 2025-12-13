// pages/manager/statistics/statistics.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    isLoading: false,
    
    // 今日统计
    todayStats: {
      newIssues: 0,
      resolvedToday: 0,
      pendingIssues: 0
    },
    
    // 状态统计
    statusStats: {
      pending: 0,
      assigned: 0,
      processing: 0,
      resolved: 0,
      closed: 0
    },
    
    // 优先级统计
    priorityStats: {
      low: 0,
      medium: 0,
      high: 0,
      urgent: 0
    },
    
    // 类别统计
    categoryStats: {},
    categoryList: [],
    
    // 总体统计
    totalIssues: 0,
    totalWorkers: 0,
    avgResolveTime: 0,
    avgSatisfaction: 0,
    
    // 维修工统计
    workerStats: [],
    
    // 图表选项
    chartOption: 'status' // status, priority, category
  },

  onLoad(options) {
    this.initPage();
    this.loadStatistics();
  },

  onShow() {
    this.loadStatistics();
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

  // 加载统计数据
  async loadStatistics() {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });
      
      console.log('📊 开始加载统计数据...');
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数获取统计数据
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getManagerStats',
          phoneNumber: phoneNumber
        }
      });

      console.log('📊 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const stats = result.result.data;
        console.log('✅ 成功获取统计数据:', stats);
        
        // 处理类别统计数据为数组
        const categoryList = Object.keys(stats.categoryStats).map(key => ({
          name: key,
          count: stats.categoryStats[key]
        })).sort((a, b) => b.count - a.count);
        
        this.setData({
          todayStats: stats.todayStats,
          statusStats: stats.statusStats,
          priorityStats: stats.priorityStats,
          categoryStats: stats.categoryStats,
          categoryList: categoryList,
          totalIssues: stats.totalIssues,
          totalWorkers: stats.totalWorkers,
          avgResolveTime: stats.avgResolveTime,
          avgSatisfaction: stats.avgSatisfaction,
          workerStats: stats.workerStats
        });
        
        console.log('📊 统计数据加载完成');
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载统计数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 切换图表类型
  onChartChange(e) {
    const chartOption = e.detail.value;
    this.setData({ chartOption });
  },

  // 查看维修工详情
  onViewWorkerDetail(e) {
    const workerId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/worker-detail/worker-detail?id=${workerId}`
    });
  },

  // 跳转到待处理列表
  onGoToPending() {
    wx.navigateTo({
      url: '/pages/manager/pending/pending'
    });
  },

  // 跳转到已分配列表
  onGoToAssigned() {
    wx.navigateTo({
      url: '/pages/manager/assigned/assigned'
    });
  },

  // 跳转到已解决列表
  onGoToResolved() {
    wx.navigateTo({
      url: '/pages/manager/resolved/resolved'
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const map = {
      'pending': '待处理',
      'assigned': '已分配',
      'processing': '处理中',
      'parts_sent': '配件已发出',
      'parts_received': '返件已收到',
      'resolved': '已解决',
      'closed': '已关闭',
      'cancelled': '已取消'
    };
    return map[status] || '未知';
  },

  // 获取状态颜色
  getStatusColor(status) {
    const map = {
      'pending': '#fa8c16',
      'assigned': '#1890ff',
      'processing': '#722ed1',
      'resolved': '#52c41a',
      'closed': '#666',
      'cancelled': '#f44336'
    };
    return map[status] || '#666';
  },

  // 获取优先级文本
  getPriorityText(priority) {
    const map = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'urgent': '紧急'
    };
    return map[priority] || '未知';
  },

  // 获取优先级颜色
  getPriorityColor(priority) {
    const map = {
      'low': '#52c41a',
      'medium': '#1890ff',
      'high': '#fa8c16',
      'urgent': '#f5222d'
    };
    return map[priority] || '#666';
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadStatistics();
    wx.stopPullDownRefresh();
  }
});