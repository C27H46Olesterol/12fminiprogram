// pages/manager/resolved/resolved.js
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
    selectedWorkerId: '',
    selectedWorkerIndex: 0,
    selectedDate: '',
    workers: [{ _id: '', name: '全部维修工' }],
    // 删除功能相关
    isEditMode: false,
    selectedIssues: []
  },

  onLoad(options) {
    this.initPage();
    this.loadWorkers();
    this.loadResolvedIssues();
  },

  onShow() {
    this.loadResolvedIssues();
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

  // 加载维修工列表
  async loadWorkers() {
    try {
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkers',
          phoneNumber: phoneNumber
        }
      });

      if (result.result && result.result.success) {
        const workers = result.result.data || [];
        this.setData({ workers });
      }
    } catch (error) {
      console.error('❌ 加载维修工列表失败:', error);
    }
  },

  // 加载已解决问题
  async loadResolvedIssues() {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });
      
      console.log('📋 开始加载已解决问题...');
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数获取真实数据
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getResolvedIssues',
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          workerId: this.data.selectedWorker,
          startDate: this.data.startDate,
          endDate: this.data.endDate,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取已解决问题，原始数据:', data);
        
        // data 的结构是 { data: [...], total: number, page: number, pageSize: number, errMsg: "..." }
        const newIssues = data.data || [];
        console.log('✅ 解析后的问题列表:', newIssues.length, '条, 总数:', data.total);
        
        const issues = this.data.currentPage === 1 ? newIssues : [...this.data.issues, ...newIssues];
        
        this.setData({
          issues: issues,
          total: data.total || 0,
          hasMore: newIssues.length === this.data.pageSize
        });
        
        console.log(`📋 加载完成: ${issues.length}/${this.data.total} 个问题，hasMore: ${newIssues.length === this.data.pageSize}`);
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载已解决问题失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 查看问题详情
  onViewIssue(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/issue-detail/issue-detail?id=${issueId}`
    });
  },

  // 筛选维修工
  onWorkerChange(e) {
    const workerId = e.detail.value;
    this.setData({
      selectedWorker: workerId,
      currentPage: 1,
      issues: []
    });
    this.loadResolvedIssues();
  },

  // 显示日期选择器
  onShowDatePicker() {
    this.setData({ showDatePicker: true });
  },

  // 隐藏日期选择器
  onHideDatePicker() {
    this.setData({ showDatePicker: false });
  },

  // 开始日期改变
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value,
      currentPage: 1,
      issues: []
    });
    this.loadResolvedIssues();
  },

  // 结束日期改变
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value,
      currentPage: 1,
      issues: []
    });
    this.loadResolvedIssues();
  },

  // 清除日期筛选
  onClearDateFilter() {
    this.setData({
      startDate: '',
      endDate: '',
      currentPage: 1,
      issues: []
    });
    this.loadResolvedIssues();
  },

  // 获取满意度文本
  getSatisfactionText(satisfaction) {
    if (!satisfaction) return '未评价';
    const map = {
      1: '很不满意',
      2: '不满意',
      3: '一般',
      4: '满意',
      5: '很满意'
    };
    return map[satisfaction] || '未评价';
  },

  // 获取满意度颜色
  getSatisfactionColor(satisfaction) {
    if (!satisfaction) return '#999';
    const map = {
      1: '#f5222d',
      2: '#fa8c16',
      3: '#faad14',
      4: '#52c41a',
      5: '#1890ff'
    };
    return map[satisfaction] || '#999';
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
    this.setData({
      currentPage: 1,
      issues: []
    });
    this.loadResolvedIssues();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this.loadResolvedIssues();
    }
  },

  // 加载更多
  loadMore() {
    this.onReachBottom();
  },

  // 查看详情
  viewDetail(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/issue-detail/issue-detail?id=${issueId}`
    });
  },

  // 查看照片
  viewImages(e) {
    const images = e.currentTarget.dataset.images;
    if (images && images.length > 0) {
      wx.previewImage({
        urls: images,
        current: images[0]
      });
    }
  },

  // 维修工筛选
  onWorkerChange(e) {
    const index = e.detail.value;
    const worker = this.data.workers[index];
    this.setData({
      selectedWorkerIndex: index,
      selectedWorkerId: worker._id,
      currentPage: 1,
      issues: []
    });
    this.loadResolvedIssues();
  },

  // 日期筛选
  onDateChange(e) {
    this.setData({
      selectedDate: e.detail.value,
      currentPage: 1,
      issues: []
    });
    this.loadResolvedIssues();
  },

  // ============ 删除功能 ============
  
  // 切换编辑模式
  toggleEditMode() {
    this.setData({
      isEditMode: !this.data.isEditMode,
      selectedIssues: []
    });
  },

  // 取消编辑
  cancelEdit() {
    // 清除所有 selected 状态
    const issues = this.data.issues.map(issue => ({
      ...issue,
      selected: false
    }));
    
    this.setData({
      isEditMode: false,
      selectedIssues: [],
      issues
    });
  },

  // 切换选中状态
  toggleSelect(e) {
    const issueId = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const issues = this.data.issues;
    const selectedIssues = [...this.data.selectedIssues];
    
    // 切换选中状态
    issues[index].selected = !issues[index].selected;
    
    // 更新 selectedIssues 数组
    const selectedIndex = selectedIssues.indexOf(issueId);
    if (issues[index].selected) {
      if (selectedIndex === -1) {
        selectedIssues.push(issueId);
      }
    } else {
      if (selectedIndex > -1) {
        selectedIssues.splice(selectedIndex, 1);
      }
    }
    
    this.setData({ 
      issues,
      selectedIssues 
    });
  },

  // 单个删除
  async deleteSingle(e) {
    const issueId = e.currentTarget.dataset.id;
    
    const res = await wx.showModal({
      title: '确认删除',
      content: '确定要删除这个工单吗？删除后无法恢复。'
    });
    
    if (!res.confirm) return;
    
    await this.deleteIssues([issueId]);
  },

  // 批量删除
  async batchDelete() {
    if (this.data.selectedIssues.length === 0) {
      wx.showToast({
        title: '请先选择工单',
        icon: 'none'
      });
      return;
    }
    
    const res = await wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${this.data.selectedIssues.length} 个工单吗？删除后无法恢复。`
    });
    
    if (!res.confirm) return;
    
    await this.deleteIssues(this.data.selectedIssues);
  },

  // 执行删除
  async deleteIssues(issueIds) {
    try {
      wx.showLoading({
        title: '删除中...',
        mask: true
      });
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'deleteIssues',
          issueIds: issueIds,
          phoneNumber: phoneNumber
        }
      });
      
      wx.hideLoading();
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: result.result.message || '删除成功',
          icon: 'success'
        });
        
        // 退出编辑模式并刷新列表
        this.setData({
          isEditMode: false,
          selectedIssues: [],
          currentPage: 1,
          issues: []
        });
        
        this.loadResolvedIssues();
      } else {
        wx.showToast({
          title: result.result?.message || '删除失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 删除工单失败:', error);
      wx.showToast({
        title: '删除失败',
        icon: 'error'
      });
    }
  }
})