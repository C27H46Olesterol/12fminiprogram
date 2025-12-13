// pages/manager/rating-feedback/rating-feedback.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    issues: [],
    isLoading: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10,
    total: 0,
    filterType: 'all' // all, rated, unrated
  },

  onLoad(options) {
    this.initPage();
    this.loadIssues();
  },

  onShow() {
    // 从评价页面返回时刷新列表
    this.loadIssues();
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

  // 加载工单列表
  async loadIssues(reset = true) {
    if (this.data.isLoading) return;
    
    try {
      if (reset) {
        this.setData({ 
          isLoading: true,
          currentPage: 1,
          issues: []
        });
      } else {
        this.setData({ isLoading: true });
      }
      
      console.log('📋 开始加载已完成工单...');
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数获取数据
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getCompletedIssuesForRating',
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          filterType: this.data.filterType,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取工单列表:', data);
        
        // 格式化时间
        const formattedIssues = (data.data || []).map(item => {
          console.log('🔍 工单数据:', {
            _id: item._id,
            issueId: item.issueId,
            title: item.title
          });
          return {
            ...item,
            resolvedTime: this.formatTime(item.resolvedTime),
            managerRatedTime: item.managerRatedTime ? this.formatTime(item.managerRatedTime) : ''
          };
        });
        
        this.setData({
          issues: reset ? formattedIssues : [...this.data.issues, ...formattedIssues],
          total: data.total || 0,
          hasMore: (data.page * data.pageSize) < data.total
        });
        
        console.log('📊 数据加载完成，共', this.data.total, '个工单');
        console.log('📊 第一个工单的issueId:', formattedIssues[0]?.issueId);
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载工单失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 筛选切换
  onFilterChange(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ filterType: type });
    this.loadIssues(true);
  },

  // 查看工单详情
  onViewIssue(e) {
    const issueId = e.currentTarget.dataset.issueId;
    wx.navigateTo({
      url: `/pages/manager/issue-detail/issue-detail?id=${issueId}`
    });
  },

  // 评价工单
  onRateIssue(e) {
    const issueId = e.currentTarget.dataset.issueId;
    const id = e.currentTarget.dataset.id;
    const hasRating = e.currentTarget.dataset.hasRating;
    
    console.log('🔍 onRateIssue - issueId:', issueId);
    console.log('🔍 onRateIssue - _id:', id);
    console.log('🔍 onRateIssue - hasRating:', hasRating);
    
    // 优先使用 issueId，如果没有则使用 _id
    const finalId = issueId || id;
    
    // 验证 ID
    if (!finalId) {
      wx.showToast({
        title: '工单ID缺失',
        icon: 'error'
      });
      console.error('❌ 工单ID缺失，无法跳转');
      return;
    }
    
    if (!issueId) {
      console.warn('⚠️ issueId为空，使用_id作为备选:', id);
    }
    
    wx.navigateTo({
      url: `/pages/manager/rate-issue/rate-issue?id=${finalId}&readonly=${hasRating ? 'true' : 'false'}`
    });
  },

  // 加载更多
  loadMore() {
    if (!this.data.hasMore || this.data.isLoading) return;
    
    this.setData({ currentPage: this.data.currentPage + 1 });
    this.loadIssues(false);
  },

  // 获取评分文本
  getRatingText(rating) {
    const map = {
      1: '很不满意',
      2: '不满意',
      3: '一般',
      4: '满意',
      5: '很满意'
    };
    return map[rating] || '未评价';
  },

  // 格式化时间
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

  // 下拉刷新
  onPullDownRefresh() {
    this.loadIssues(true);
    wx.stopPullDownRefresh();
  }
});

