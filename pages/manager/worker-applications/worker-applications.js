// pages/manager/worker-applications/worker-applications.js
const app = getApp();

Page({
  data: {
    statusFilter: 'all',
    applications: [],
    allCount: 0,
    pendingCount: 0,
    currentPage: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isLoadingMore: false
  },

  onLoad() {
    this.loadApplications();
    this.loadCounts();
  },

  onShow() {
    // 页面显示时刷新数据
    this.refreshData();
  },

  // 刷新数据
  refreshData() {
    this.setData({
      currentPage: 1,
      hasMore: true,
      applications: []
    });
    this.loadApplications();
    this.loadCounts();
  },

  // 加载申请列表
  async loadApplications() {
    if (this.data.isLoading || this.data.isLoadingMore) {
      return;
    }

    try {
      if (this.data.currentPage === 1) {
        this.setData({ isLoading: true });
        app.showLoading('加载中...');
      } else {
        this.setData({ isLoadingMore: true });
      }

      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkerApplications',
          phoneNumber: phoneNumber,
          status: this.data.statusFilter,
          page: this.data.currentPage,
          pageSize: this.data.pageSize
        }
      });

      console.log('获取申请列表结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        const newApplications = (data.data || []).map(app => ({
          ...app,
          statusText: this.getStatusText(app.status),
          submitTimeText: this.formatTime(app.submitTime),
          handleTimeText: this.formatTime(app.approvedTime || app.rejectedTime),
          handlerName: app.approvedByName || app.rejectedByName || ''
        }));

        const allApplications = this.data.currentPage === 1 
          ? newApplications 
          : [...this.data.applications, ...newApplications];

        this.setData({
          applications: allApplications,
          hasMore: newApplications.length === this.data.pageSize
        });
      } else {
        wx.showToast({
          title: result.result?.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载申请列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ 
        isLoading: false,
        isLoadingMore: false
      });
      app.hideLoading();
    }
  },

  // 加载统计数量
  async loadCounts() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      // 获取全部数量
      const allResult = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkerApplications',
          phoneNumber: phoneNumber,
          status: 'all',
          page: 1,
          pageSize: 1
        }
      });

      // 获取待审核数量
      const pendingResult = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkerApplications',
          phoneNumber: phoneNumber,
          status: 'pending',
          page: 1,
          pageSize: 1
        }
      });

      if (allResult.result && allResult.result.success) {
        this.setData({ allCount: allResult.result.data.total });
      }

      if (pendingResult.result && pendingResult.result.success) {
        this.setData({ pendingCount: pendingResult.result.data.total });
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  },

  // 筛选状态
  onFilterChange(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.statusFilter) {
      return;
    }

    this.setData({
      statusFilter: status,
      currentPage: 1,
      hasMore: true,
      applications: []
    });

    this.loadApplications();
  },

  // 获取状态文本
  getStatusText(status) {
    const statusMap = {
      'pending': '待审核',
      'approved': '已通过',
      'rejected': '已拒绝'
    };
    return statusMap[status] || '未知';
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return '';
    
    const date = time.toDate ? time.toDate() : new Date(time);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 预览图片
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: [url],
      current: url
    });
  },

  // 通过申请
  onApprove(e) {
    const appId = e.currentTarget.dataset.id;
    const appName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '确认通过',
      content: `确定要通过 ${appName} 的维修工申请吗？通过后该用户将成为维修工。`,
      confirmText: '通过',
      confirmColor: '#1677ff',
      success: (res) => {
        if (res.confirm) {
          this.approveApplication(appId);
        }
      }
    });
  },

  // 执行通过操作
  async approveApplication(applicationId) {
    wx.showLoading({ title: '处理中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'approveWorkerApplication',
          applicationId: applicationId,
          phoneNumber: phoneNumber
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: '已通过申请',
          icon: 'success'
        });
        this.refreshData();
      } else {
        wx.showToast({
          title: result.result?.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('通过申请失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 拒绝申请
  onReject(e) {
    const appId = e.currentTarget.dataset.id;
    const appName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '确认拒绝',
      content: `确定要拒绝 ${appName} 的维修工申请吗？`,
      confirmText: '拒绝',
      confirmColor: '#ff4d4f',
      editable: true,
      placeholderText: '请输入拒绝原因（选填）',
      success: (res) => {
        if (res.confirm) {
          const reason = res.content || '未通过审核';
          this.rejectApplication(appId, reason);
        }
      }
    });
  },

  // 执行拒绝操作
  async rejectApplication(applicationId, reason) {
    wx.showLoading({ title: '处理中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'rejectWorkerApplication',
          applicationId: applicationId,
          reason: reason,
          phoneNumber: phoneNumber
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: '已拒绝申请',
          icon: 'success'
        });
        this.refreshData();
      } else {
        wx.showToast({
          title: result.result?.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('拒绝申请失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      this.setData({ currentPage: this.data.currentPage + 1 });
      this.loadApplications();
    }
  }
});

