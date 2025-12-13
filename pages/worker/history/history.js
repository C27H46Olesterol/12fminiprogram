// pages/worker/history/history.js
const app = getApp();

Page({
  data: {
    startDate: '',
    endDate: '',
    historyList: [],
    stats: {
      total: 0,
      completed: 0,
      rating: 0
    },
    isLoadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10
  },

  onLoad() {
    this.initDateRange();
    this.loadHistory();
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshData();
  },

  // 初始化日期范围
  initDateRange() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    this.setData({
      startDate: this.formatDate(lastMonth),
      endDate: this.formatDate(today)
    });
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 刷新数据
  refreshData() {
    this.setData({
      currentPage: 1,
      hasMore: true,
      historyList: []
    });
    this.loadHistory();
  },

  // 加载历史记录（调用云函数）
  async loadHistory() {
    try {
      if (this.data.currentPage === 1) {
        app.showLoading('加载中...');
      }

      // 获取用户手机号（兼容 phone 与 phoneNumber）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getHistory',
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          startDate: this.data.startDate,
          endDate: this.data.endDate,
          phoneNumber: phoneNumber
        }
      });

      if (result.result && result.result.success) {
        const data = result.result.data || {};
        const list = data.data || data || [];

        // 统一字段，适配模板
        const newHistory = list.map(item => ({
          id: item.issueId || item._id,
          title: item.title,
          description: item.description,
          customerName: item.clientName || item.customerName,
          customerPhone: item.clientPhone || item.customerPhone,
          completeTime: this.formatTime(item.resolvedTime || item.updateTime || item.createTime),
          rating: item.satisfaction || 0,
          processRecord: item.processingRecord || item.resultDescription || ''
        }));
        const allHistory = this.data.currentPage === 1 ? newHistory : [...this.data.historyList, ...newHistory];

        // 简单统计
        const completed = newHistory.length; // 历史仅展示已完成
        const ratings = list.filter(item => item.satisfaction);
        const avgRating = ratings.length > 0 ? (ratings.reduce((s, i) => s + i.satisfaction, 0) / ratings.length) : 0;

        this.setData({
          historyList: allHistory,
          hasMore: newHistory.length === this.data.pageSize,
          stats: {
            total: allHistory.length,
            completed: completed,
            rating: Number(avgRating.toFixed(1))
          }
        });
      } else {
        console.error('获取历史记录失败:', result.result?.message);
        app.showError(result.result?.message || '加载失败，请重试');
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
      app.showError('加载失败，请重试');
    } finally {
      app.hideLoading();
      this.setData({ isLoadingMore: false });
    }
  },

  // 已移除模拟数据，统一走云函数

  // 开始日期选择
  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  // 结束日期选择
  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
  },

  // 筛选
  onFilter() {
    this.refreshData();
  },

  // 查看历史记录详情
  onViewHistory(e) {
    const historyId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/worker/history-detail/history-detail?id=${historyId}`
    });
  },

  // 格式化时间戳
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 加载更多
  onLoadMore() {
    if (this.data.isLoadingMore || !this.data.hasMore) {
      return;
    }
    
    this.setData({ 
      isLoadingMore: true,
      currentPage: this.data.currentPage + 1
    });
    
    this.loadHistory();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.onLoadMore();
    }
  }
});