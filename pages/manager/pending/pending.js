// pages/manager/pending/pending.js
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
    // 新的筛选类型
    filterType: 'pending', // pending(待分配), processing(处理中), parts_request(待发件), parts_sent(待返件), parts_received(待完成)
    filterTypes: [
      { value: 'pending', label: '待分配', count: 0 },
      { value: 'processing', label: '处理中', count: 0 },
      { value: 'parts_sent', label: '待返件', count: 0 },
      { value: 'parts_received', label: '待完成', count: 0 }
    ],
    selectedCategory: '',
    selectedPriority: '',
    categories: ['全部', '空调故障', '制冷系统', '电气问题', '机械故障', '其他'],
    priorities: [
      { value: '', label: '全部优先级' },
      { value: 'low', label: '低' },
      { value: 'medium', label: '中' },
      { value: 'high', label: '高' },
      { value: 'urgent', label: '紧急' }
    ],
    // 分配功能相关
    showAssignModal: false,
    selectedIssueId: '',
    workers: [],
    filteredWorkers: [],
    workerSearchKeyword: '',
    selectedWorker: '',
    selectedWorkerId: '',
    // 删除功能相关
    isEditMode: false,
    selectedIssues: []
  },

  onLoad(options) {
    this.initPage();
    this.loadIssues();
    this.loadStatusCounts();
  },

  onShow() {
    this.loadIssues();
    // 重新加载维修工列表，确保数据最新
    this.loadWorkers();
    // 重新加载各状态数量
    this.loadStatusCounts();
  },

  // 切换筛选类型
  onFilterTypeChange(e) {
    const filterType = e.currentTarget.dataset.type;
    this.setData({
      filterType: filterType,
      currentPage: 1,
      issues: []
    });
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
    this.loadWorkers();
  },

  // 加载各状态的工单数量
  async loadStatusCounts() {
    try {
      console.log('📊 开始加载各状态工单数量...');
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 获取待分配数量（pending状态）
      const pendingResult = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getPendingIssues',
          page: 1,
          pageSize: 1,
          phoneNumber: phoneNumber
        }
      });
      
      // 获取处理中数量（assigned和processing状态）
      const processingResult = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getAssignedIssues',
          page: 1,
          pageSize: 1,
          selectedStatus: 'processing',
          phoneNumber: phoneNumber
        }
      });
      
      // 获取待返件数量（parts_sent状态）
      const partsSentResult = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getAssignedIssues',
          page: 1,
          pageSize: 1,
          selectedStatus: 'parts_sent',
          phoneNumber: phoneNumber
        }
      });
      
      // 获取待完成数量（parts_received状态）
      const partsReceivedResult = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getAssignedIssues',
          page: 1,
          pageSize: 1,
          selectedStatus: 'parts_received',
          phoneNumber: phoneNumber
        }
      });
      
      // 更新 filterTypes 中的 count
      const filterTypes = [...this.data.filterTypes];
      filterTypes[0].count = pendingResult.result?.data?.total || 0;
      filterTypes[1].count = processingResult.result?.data?.total || 0;
      filterTypes[2].count = partsSentResult.result?.data?.total || 0;
      filterTypes[3].count = partsReceivedResult.result?.data?.total || 0;
      
      console.log('✅ 各状态数量:', {
        pending: filterTypes[0].count,
        processing: filterTypes[1].count,
        parts_sent: filterTypes[2].count,
        parts_received: filterTypes[3].count
      });
      
      this.setData({ filterTypes });
      
    } catch (error) {
      console.error('❌ 加载状态数量失败:', error);
      // 失败时不显示错误提示，静默失败
    }
  },

  // 加载维修工列表
  async loadWorkers() {
    try {
      console.log('🔧 开始加载维修工列表...');
      
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

      console.log('🔧 维修工列表加载结果:', result);

      if (result.result && result.result.success) {
        const workers = result.result.data || [];
        console.log('✅ 成功加载', workers.length, '个维修工');
        this.setData({
          workers: workers,
          filteredWorkers: workers
        });
      } else {
        console.error('❌ 加载维修工失败:', result.result?.message);
        wx.showToast({
          title: result.result?.message || '加载维修工失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('❌ 加载维修工列表失败:', error);
      wx.showToast({
        title: '加载维修工失败',
        icon: 'none'
      });
    }
  },

  // 加载问题列表（根据筛选类型）
  async loadIssues() {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });
      
      console.log('📋 开始加载问题列表...', '筛选类型:', this.data.filterType);
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 根据筛选类型确定调用的云函数action
      let action;
      let additionalData = {};
      
      if (this.data.filterType === 'pending') {
        // 待分配任务：状态为 pending 的工单
        action = 'getPendingIssues';
      } else {
        // 其他状态：调用已分配列表接口，但通过 selectedStatus 筛选
        action = 'getAssignedIssues';
        additionalData.selectedStatus = this.data.filterType;
      }
      
      // 调用云函数获取真实数据
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: action,
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          category: this.data.selectedCategory,
          priority: this.data.selectedPriority,
          phoneNumber: phoneNumber,
          ...additionalData
        }
      });

      console.log('📋 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取问题列表，原始数据:', data);
        
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
      console.error('❌ 加载问题列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 兼容旧方法名
  loadPendingIssues() {
    this.loadIssues();
  },

  // 查看问题详情
  onViewIssue(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/issue-detail/issue-detail?id=${issueId}`
    });
  },

  // 分配维修工
  onAssignWorker(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/assign-worker/assign-worker?id=${issueId}`
    });
  },

  // 设置优先级
  onSetPriority(e) {
    const issueId = e.currentTarget.dataset.id;
    const currentPriority = e.currentTarget.dataset.priority;
    
    wx.showActionSheet({
      itemList: ['低', '中', '高', '紧急'],
      success: (res) => {
        const priorities = ['low', 'medium', 'high', 'urgent'];
        const newPriority = priorities[res.tapIndex];
        this.updateIssuePriority(issueId, newPriority);
      }
    });
  },

  // 更新问题优先级
  async updateIssuePriority(issueId, priority) {
    try {
      app.showLoading('更新中...');
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'setIssuePriority',
          issueId: issueId,
          priority: priority,
          phoneNumber: phoneNumber
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: '优先级更新成功',
          icon: 'success'
        });
        this.loadPendingIssues();
      } else {
        wx.showToast({
          title: '更新失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 更新优先级失败:', error);
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    } finally {
      app.hideLoading();
    }
  },

  // 筛选分类
  onCategoryChange(e) {
    const category = e.detail.value;
    this.setData({
      selectedCategory: category,
      currentPage: 1,
      issues: []
    });
    this.loadPendingIssues();
  },

  // 筛选优先级
  onPriorityChange(e) {
    const priority = e.detail.value;
    this.setData({
      selectedPriority: priority,
      currentPage: 1,
      issues: []
    });
    this.loadPendingIssues();
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
    this.loadIssues();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this.loadIssues();
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

  // 分配任务（显示弹窗）
  async assignIssue(e) {
    const issueId = e.currentTarget.dataset.id;
    
    // 如果维修工列表为空，先加载维修工
    if (!this.data.workers || this.data.workers.length === 0) {
      wx.showLoading({ title: '加载维修工...' });
      await this.loadWorkers();
      wx.hideLoading();
    }
    
    this.setData({
      selectedIssueId: issueId,
      showAssignModal: true,
      selectedWorker: '',
      selectedWorkerId: '',
      workerSearchKeyword: '',
      filteredWorkers: this.data.workers
    });
  },

  // 显示分配维修工弹窗
  async onShowAssignModal(e) {
    const issueId = e.currentTarget.dataset.id;
    
    // 如果维修工列表为空，先加载维修工
    if (!this.data.workers || this.data.workers.length === 0) {
      wx.showLoading({ title: '加载维修工...' });
      await this.loadWorkers();
      wx.hideLoading();
    }
    
    this.setData({
      selectedIssueId: issueId,
      showAssignModal: true,
      selectedWorker: '',
      selectedWorkerId: '',
      workerSearchKeyword: '',
      filteredWorkers: this.data.workers
    });
  },

  // 隐藏分配维修工弹窗
  onHideAssignModal() {
    this.setData({ 
      showAssignModal: false,
      selectedIssueId: '',
      selectedWorker: '',
      selectedWorkerId: '',
      workerSearchKeyword: '',
      filteredWorkers: this.data.workers
    });
  },

  // 搜索维修工
  onWorkerSearch(e) {
    const keyword = e.detail.value.trim().toLowerCase();
    console.log('🔍 搜索关键词:', keyword);
    
    this.setData({ workerSearchKeyword: keyword });
    
    if (!keyword) {
      // 如果搜索框为空，显示所有维修工
      this.setData({ filteredWorkers: this.data.workers });
      return;
    }
    
    // 过滤维修工列表（按姓名或手机号）
    const filteredWorkers = this.data.workers.filter(worker => {
      const nameMatch = worker.nickname && worker.nickname.toLowerCase().includes(keyword);
      const phoneMatch = worker.phone && worker.phone.includes(keyword);
      return nameMatch || phoneMatch;
    });
    
    console.log('🔍 搜索结果:', filteredWorkers.length, '个维修工');
    this.setData({ filteredWorkers });
  },

  // 选择维修工
  onSelectWorker(e) {
    const workerId = e.currentTarget.dataset.id;
    const workerIndex = e.currentTarget.dataset.index;
    console.log('✅ 选择维修工 - ID:', workerId, '索引:', workerIndex);
    this.setData({ 
      selectedWorker: workerIndex,
      selectedWorkerId: workerId
    });
  },

  // 确认分配维修工
  async onConfirmAssign() {
    if (!this.data.selectedWorkerId) {
      wx.showToast({
        title: '请选择维修工',
        icon: 'error'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '分配中...',
        mask: true
      });
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      console.log('🔧 开始分配维修工:', {
        issueId: this.data.selectedIssueId,
        workerId: this.data.selectedWorkerId,
        phoneNumber: phoneNumber
      });
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'assignWorker',
          issueId: this.data.selectedIssueId,
          workerId: this.data.selectedWorkerId,
          phoneNumber: phoneNumber
        }
      });

      wx.hideLoading();

      if (result.result && result.result.success) {
        wx.showToast({
          title: '分配成功',
          icon: 'success'
        });
        this.onHideAssignModal();
        
        // 刷新列表和数量统计
        this.setData({
          currentPage: 1,
          issues: []
        });
        this.loadPendingIssues();
        this.loadStatusCounts();
      } else {
        wx.showToast({
          title: result.result?.message || '分配失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 分配维修工失败:', error);
      wx.showToast({
        title: '分配失败',
        icon: 'error'
      });
    }
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
        
        this.loadIssues();
        this.loadStatusCounts();
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
  },

  // ============ 新增功能方法（从assigned页面移植） ============

  // 开始处理（主管代替维修工操作）
  startProcessing(e) {
    const issueId = e.currentTarget.dataset.id;
    // 跳转到发件确认页面
    wx.navigateTo({
      url: `/pages/manager/start-processing/start-processing?issueId=${issueId}`
    });
  },

  // 发出配件
  sendParts(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/send-parts/send-parts?issueId=${issueId}`
    });
  },

  // 发出返件
  returnParts(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/return-parts/return-parts?issueId=${issueId}`
    });
  },

  // 完成任务
  completeTask(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/complete-task/complete-task?issueId=${issueId}`
    });
  },

  // 同意返件
  async approveReturn(e) {
    const issueId = e.currentTarget.dataset.id;
    
    const res = await wx.showModal({
      title: '确认收货',
      content: '确认已收到维修工发回的返件吗？',
      confirmText: '确认收货',
      cancelText: '取消'
    });
    
    if (!res.confirm) return;
    
    try {
      wx.showLoading({
        title: '处理中...',
        mask: true
      });
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'approveReturnParts',
          issueId: issueId,
          approvalNote: '主管确认收到返件',
          phoneNumber: phoneNumber
        }
      });
      
      wx.hideLoading();
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '已确认收货',
          icon: 'success'
        });
        
        // 刷新列表和数量统计
        this.setData({
          currentPage: 1,
          issues: []
        });
        this.loadIssues();
        this.loadStatusCounts();
      } else {
        wx.showToast({
          title: result.result?.message || '操作失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 确认收货失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    }
  },

  // 拒绝返件
  async rejectReturn(e) {
    const issueId = e.currentTarget.dataset.id;
    
    // 弹出输入框让主管输入拒绝原因
    wx.showModal({
      title: '拒绝返件',
      content: '请输入拒绝原因',
      editable: true,
      placeholderText: '例如：配件不符、数量不对等',
      confirmText: '确认拒绝',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          const rejectionNote = res.content;
          
          if (!rejectionNote || rejectionNote.trim() === '') {
            wx.showToast({
              title: '请输入拒绝原因',
              icon: 'none'
            });
            return;
          }
          
          try {
            wx.showLoading({
              title: '处理中...',
              mask: true
            });
            
            const userInfo = wx.getStorageSync('userInfo') || {};
            const phoneNumber = userInfo.phone || userInfo.phoneNumber;
            
            const result = await wx.cloud.callFunction({
              name: 'issues',
              data: {
                action: 'rejectReturnParts',
                issueId: issueId,
                rejectionNote: rejectionNote.trim(),
                phoneNumber: phoneNumber
              }
            });
            
            wx.hideLoading();
            
            if (result.result && result.result.success) {
              wx.showToast({
                title: '已拒绝返件',
                icon: 'success'
              });
              
              // 刷新列表和数量统计
              this.setData({
                currentPage: 1,
                issues: []
              });
              this.loadIssues();
              this.loadStatusCounts();
            } else {
              wx.showToast({
                title: result.result?.message || '操作失败',
                icon: 'error'
              });
            }
            
          } catch (error) {
            wx.hideLoading();
            console.error('❌ 拒绝返件失败:', error);
            wx.showToast({
              title: '操作失败',
              icon: 'error'
            });
          }
        }
      }
    });
  }
})