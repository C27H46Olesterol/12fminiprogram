// pages/client/progress/progress.js
const app = getApp();

Page({
  data: {
    searchKeyword: '',
    statusFilter: 'all',
    feedbacks: [],
    filteredFeedbacks: [],
    isLoadingMore: false,
    hasMore: true,
    currentPage: 1,
    pageSize: 10
  },

  onLoad(options) {
    // 处理 tab 参数，如果是 rating 则筛选待评价工单
    if (options.tab === 'rating') {
      this.setData({ statusFilter: 'rating' });
    }
    this.loadFeedbacks();
  },

  onShow() {
    // 页面显示时检查是否有筛选条件（从其他页面跳转过来）
    const filterFromStorage = wx.getStorageSync('progressFilter');
    if (filterFromStorage) {
      console.log('从存储读取到筛选条件:', filterFromStorage);
      this.setData({ statusFilter: filterFromStorage });
      // 清除存储，避免下次进入时仍然应用该筛选
      wx.removeStorageSync('progressFilter');
    }

    // 刷新数据
    this.setData({
      currentPage: 1,
      hasMore: true,
      feedbacks: []
    });
    this.loadFeedbacks();
  },

  // 刷新数据
  refreshData() {
    this.setData({
      currentPage: 1,
      hasMore: true,
      feedbacks: []
    });
    this.loadFeedbacks();
  },

  // 加载反馈列表
  async loadFeedbacks() {
    try {
      if (this.data.currentPage === 1) {
        app.showLoading('加载中...');
      }

      // 获取真实的反馈数据
      const result = await this.getFeedbacksFromCloud();

      const newFeedbacks = result.data;
      const allFeedbacks = this.data.currentPage === 1 ? newFeedbacks : [...this.data.feedbacks, ...newFeedbacks];

      this.setData({
        feedbacks: allFeedbacks,
        hasMore: result.hasMore
      });

      this.filterFeedbacks();
    } catch (error) {
      console.error('加载反馈失败:', error);
      app.showError('加载失败，请重试');
    } finally {
      app.hideLoading();
      this.setData({ isLoadingMore: false });
    }
  },

  // 从云函数获取反馈数据
  async getFeedbacksFromCloud() {
    try {
      const { currentPage, pageSize } = this.data;

      // 【改造】获取当前登录用户信息
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userPhone = userInfo.phone || userInfo.phoneNumber;
      const userId = userInfo._id || userInfo.userId;

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getClientIssues',
          phone: userPhone,     // 【新增】传递手机号
          userId: userId,       // 【新增】传递用户ID
          page: currentPage,
          pageSize: pageSize
        }
      });

      console.log('云函数调用结果:', result.result);

      if (result.result && result.result.success && result.result.data && result.result.data.length > 0) {
        const issues = result.result.data;

        console.log('【进度查询】获取到工单总数:', issues.length);

        // 转换为页面需要的格式
        const formattedIssues = issues.map(issue => {
          const hasRated = issue.satisfaction > 0;
          console.log('【进度查询】转换工单:', issue.issueId, 'status:', issue.status, 'satisfaction:', issue.satisfaction, 'hasRated:', hasRated);

          return {
            id: issue.issueId || issue._id, // 确保使用issueId字段
            title: issue.issueId || issue._id,
            description: issue.description,
            status: issue.status,
            statusText: this.getStatusText(issue.status),
            priority: issue.priority,
            priorityText: this.getPriorityText(issue.priority),
            problemType: this.getCategoryText(issue.category),
            createTime: this.formatTime(issue.createTime),
            assignee: issue.assignedWorkerName || '未分配',
            lastUpdateTime: this.formatTime(issue.updateTime),
            hasRated: hasRated // 判断是否已评价
          };
        });

        console.log('【进度查询】成功获取真实数据:', formattedIssues.length, '个issues');
        console.log('【进度查询】已解决未评价的工单:', formattedIssues.filter(i => i.status === 'resolved' && !i.hasRated));

        return {
          data: formattedIssues,
          hasMore: formattedIssues.length === pageSize
        };
      }

      console.log('云函数返回空数据');
      return { data: [], hasMore: false };
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      console.log('云函数调用失败，返回空数据');
      return { data: [], hasMore: false };
    }
  },

  // 模拟数据（作为fallback）
  getMockFallbackData() {
    const { currentPage, pageSize } = this.data;
    const mockData = [
      {
        id: 'ISSUE_mock_001', // 改为ISSUE_前缀，与详情页面匹配
        title: '空调制冷效果差',
        description: '驻车空调开启后制冷效果不明显，温度下降很慢，已经影响正常使用。',
        status: 'assigned',
        statusText: '已分配',
        priority: 'high',
        priorityText: '非常紧急',
        problemType: '制冷问题',
        createTime: '2024-01-15 14:30',
        assignee: '王师傅',
        lastUpdateTime: '2024-01-15 16:20'
      },
      {
        id: 'ISSUE_mock_002',
        title: '空调异响问题',
        description: '空调运行时出现异常噪音，影响休息，特别是在夜间。',
        status: 'resolved',
        statusText: '已解决',
        priority: 'medium',
        priorityText: '紧急',
        problemType: '噪音问题',
        createTime: '2024-01-10 09:15',
        assignee: '李师傅',
        lastUpdateTime: '2024-01-12 10:30'
      },
      {
        id: 'ISSUE_mock_003',
        title: '空调无法启动',
        description: '按下开关后空调没有任何反应，指示灯也不亮。',
        status: 'pending',
        statusText: '待处理',
        priority: 'high',
        priorityText: '非常紧急',
        problemType: '电源问题',
        createTime: '2024-01-16 08:45'
      },
      {
        id: 'ISSUE_mock_004',
        title: '温度控制不准确',
        description: '设置的温度与实际温度相差较大，无法精确控制。',
        status: 'assigned',
        statusText: '已分配',
        priority: 'low',
        priorityText: '一般',
        problemType: '控制问题',
        createTime: '2024-01-14 16:20',
        assignee: '张师傅',
        lastUpdateTime: '2024-01-15 09:10'
      }
    ];

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = mockData.slice(startIndex, endIndex);

    return {
      data: pageData,
      hasMore: endIndex < mockData.length
    };
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '待处理',
      'assigned': '已分配',
      'processing': '处理中',
      'parts_sent': '配件已发出',
      'parts_received': '返件已收到',
      'resolved': '已解决',
      'closed': '已关闭',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知状态';
  },

  // 获取优先级文本
  getPriorityText(priority) {
    const priorityMap = {
      'low': '一般',
      'medium': '紧急',
      'high': '非常紧急'
    };
    return priorityMap[priority] || '一般';
  },

  // 获取分类文本
  getCategoryText(category) {
    const categoryMap = {
      'cooling': '制冷问题',
      'heating': '制热问题',
      'noise': '噪音问题',
      'power': '电源问题',
      'control': '控制问题',
      'other': '其他问题'
    };
    return categoryMap[category] || '其他问题';
  },

  // 规范化时间
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 搜索输入
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  // 执行搜索
  onSearch() {
    this.filterFeedbacks();
  },

  // 状态筛选
  onStatusFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ statusFilter: status });
    this.filterFeedbacks();
  },

  // 筛选反馈
  filterFeedbacks() {
    const { feedbacks, searchKeyword, statusFilter } = this.data;

    console.log('开始筛选，statusFilter:', statusFilter);
    console.log('feedbacks 数量:', feedbacks.length);

    let filtered = feedbacks.filter(item => {
      // 待评价筛选：已解决且未评价
      if (statusFilter === 'rating') {
        console.log('待评价筛选 - item:', item.id, 'status:', item.status, 'hasRated:', item.hasRated);
        // 只保留已解决且未评价的
        const isResolved = item.status === 'resolved';
        const notRated = !item.hasRated;
        console.log('  isResolved:', isResolved, 'notRated:', notRated);
        return isResolved && notRated;
      }
      // 普通状态筛选
      else if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      // 关键词搜索
      if (searchKeyword.trim() !== '') {
        const keyword = searchKeyword.toLowerCase();
        return item.id.toLowerCase().includes(keyword) ||
          item.title.toLowerCase().includes(keyword) ||
          item.description.toLowerCase().includes(keyword) ||
          item.problemType.toLowerCase().includes(keyword);
      }

      return true;
    });

    console.log('筛选后 filtered 数量:', filtered.length);
    this.setData({ filteredFeedbacks: filtered });
  },

  // 查看反馈详情
  onViewFeedback(e) {
    const feedbackId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/client/feedback/feedback?id=${feedbackId}&mode=view`
    });
  },

  // 评价问题
  onRateIssue(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/client/rate-issue/rate-issue?id=${issueId}`
    });
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

    this.loadFeedbacks();
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