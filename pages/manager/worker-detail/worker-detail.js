// pages/manager/worker-detail/worker-detail.js
const app = getApp();

Page({
  data: {
    workerId: '',
    workerInfo: null,
    
    // Tab 切换
    activeTab: 'info', // info, completed, processing, ratings
    
    // 已完成工单列表
    completedIssues: [],
    completedPageNum: 1,
    completedPageSize: 20,
    completedHasMore: true,
    completedLoading: false,
    
    // 处理中工单列表
    processingIssues: [],
    processingPageNum: 1,
    processingPageSize: 20,
    processingHasMore: true,
    processingLoading: false,
    
    // 评分列表
    ratings: [],
    ratingsPageNum: 1,
    ratingsPageSize: 20,
    ratingsHasMore: true,
    ratingsLoading: false,
    
    loading: true
  },

  onLoad(options) {
    console.log('📋 维修工详情页面加载');
    
    if (options.workerId) {
      this.setData({ workerId: options.workerId });
      this.loadWorkerInfo();
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },

  // 加载维修工信息
  async loadWorkerInfo() {
    try {
      this.setData({ loading: true });

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkerDetail',
          workerId: this.data.workerId
        }
      });

      console.log('📋 云函数返回结果:', result);

      if (result.result && result.result.success) {
        const workerInfo = result.result.data;
        
        // 计算注册天数
        const registerDate = new Date(workerInfo.registerTime);
        const now = new Date();
        const diffDays = Math.floor((now - registerDate) / (1000 * 60 * 60 * 24));
        
        // 格式化注册时间
        const registerTimeText = this.formatDateTime(workerInfo.registerTime);

        this.setData({
          workerInfo: {
            ...workerInfo,
            registerDays: diffDays,
            registerTimeText: registerTimeText
          }
        });

        console.log('✅ 获取维修工信息成功:', workerInfo.name);
      } else {
        wx.showToast({
          title: result.result?.message || '获取失败',
          icon: 'none'
        });
      }

    } catch (error) {
      console.error('❌ 加载维修工信息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 切换 Tab
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    console.log('📋 切换 Tab:', tab);
    
    this.setData({ activeTab: tab });
    
    // 加载对应数据
    if (tab === 'completed' && this.data.completedIssues.length === 0) {
      this.loadIssues('completed');
    } else if (tab === 'processing' && this.data.processingIssues.length === 0) {
      this.loadIssues('processing');
    } else if (tab === 'ratings' && this.data.ratings.length === 0) {
      this.loadRatings();
    }
  },

  // 加载工单列表
  async loadIssues(type, loadMore = false) {
    // 根据类型确定使用哪个数据字段
    const isCompleted = type === 'completed';
    const loadingKey = isCompleted ? 'completedLoading' : 'processingLoading';
    const issuesKey = isCompleted ? 'completedIssues' : 'processingIssues';
    const pageNumKey = isCompleted ? 'completedPageNum' : 'processingPageNum';
    const pageSizeKey = isCompleted ? 'completedPageSize' : 'processingPageSize';
    const hasMoreKey = isCompleted ? 'completedHasMore' : 'processingHasMore';
    
    if (this.data[loadingKey]) return;
    
    try {
      this.setData({ [loadingKey]: true });
      
      if (!loadMore) {
        this.setData({
          [pageNumKey]: 1,
          [issuesKey]: [],
          [hasMoreKey]: true
        });
      }

      console.log('📋 加载工单列表 - 类型:', type, '页码:', this.data[pageNumKey]);

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkerIssues',
          workerId: this.data.workerId,
          type: type, // completed 或 processing
          pageNum: this.data[pageNumKey],
          pageSize: this.data[pageSizeKey]
        }
      });

      if (result.result && result.result.success) {
        const { issues, total, hasMore } = result.result.data;
        
        console.log('✅ 获取工单列表成功:', issues.length, '条，总数:', total);

        // 处理工单数据
        const processedIssues = issues.map(issue => ({
          ...issue,
          createTimeText: this.formatDateTime(issue.createTime),
          resolvedTimeText: issue.resolvedTime ? this.formatDateTime(issue.resolvedTime) : '',
          statusText: this.getStatusText(issue.status)
        }));

        // 合并数据
        const newIssues = loadMore ? [...this.data[issuesKey], ...processedIssues] : processedIssues;

        this.setData({
          [issuesKey]: newIssues,
          [hasMoreKey]: hasMore,
          [pageNumKey]: this.data[pageNumKey] + 1
        });

      } else {
        wx.showToast({
          title: result.result?.message || '获取失败',
          icon: 'none'
        });
      }

    } catch (error) {
      console.error('❌ 加载工单列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ [loadingKey]: false });
    }
  },

  // 加载评分列表
  async loadRatings(loadMore = false) {
    if (this.data.ratingsLoading) return;
    
    try {
      this.setData({ ratingsLoading: true });
      
      if (!loadMore) {
        this.setData({
          ratingsPageNum: 1,
          ratings: [],
          ratingsHasMore: true
        });
      }

      console.log('📋 加载评分列表 - 页码:', this.data.ratingsPageNum);

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkerRatings',
          workerId: this.data.workerId,
          pageNum: this.data.ratingsPageNum,
          pageSize: this.data.ratingsPageSize
        }
      });

      if (result.result && result.result.success) {
        const { ratings, total, hasMore } = result.result.data;
        
        console.log('✅ 获取评分列表成功:', ratings.length, '条，总数:', total);

        // 处理评分数据
        const processedRatings = ratings.map(rating => ({
          ...rating,
          createTimeText: this.formatDateTime(rating.createTime)
        }));

        // 合并数据
        const newRatings = loadMore ? [...this.data.ratings, ...processedRatings] : processedRatings;

        this.setData({
          ratings: newRatings,
          ratingsHasMore: hasMore,
          ratingsPageNum: this.data.ratingsPageNum + 1
        });

      } else {
        wx.showToast({
          title: result.result?.message || '获取失败',
          icon: 'none'
        });
      }

    } catch (error) {
      console.error('❌ 加载评分列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ ratingsLoading: false });
    }
  },

  // 加载更多工单
  onLoadMoreIssues() {
    const type = this.data.activeTab === 'completed' ? 'completed' : 'processing';
    const hasMoreKey = type === 'completed' ? 'completedHasMore' : 'processingHasMore';
    const loadingKey = type === 'completed' ? 'completedLoading' : 'processingLoading';
    
    if (!this.data[hasMoreKey] || this.data[loadingKey]) return;
    
    this.loadIssues(type, true);
  },

  // 加载更多评分
  onLoadMoreRatings() {
    if (!this.data.ratingsHasMore || this.data.ratingsLoading) return;
    this.loadRatings(true);
  },

  // 查看工单详情
  onViewIssue(e) {
    const issueId = e.currentTarget.dataset.id;
    console.log('📋 查看工单详情:', issueId);
    
    wx.navigateTo({
      url: `/pages/manager/issue-detail/issue-detail?id=${issueId}`
    });
  },

  // 拨打电话
  onCallPhone() {
    if (!this.data.workerInfo || !this.data.workerInfo.phone) return;
    
    wx.makePhoneCall({
      phoneNumber: this.data.workerInfo.phone
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '待分配',
      'assigned': '已分配',
      'in_progress': '处理中',
      'parts_requested': '申请配件',
      'parts_sent': '配件已发',
      'parts_received': '配件已收',
      'resolved': '已解决',
      'cancelled': '已取消'
    };
    return statusMap[status] || status;
  },

  // 格式化日期时间
  formatDateTime(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
});

