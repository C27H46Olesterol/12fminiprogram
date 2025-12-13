// pages/manager/assigned/assigned.js
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
    selectedStatus: '',
    selectedStatusIndex: 0,
    workers: [{ _id: '', name: '全部维修工' }],
    statuses: [
      { value: '', label: '全部状态' },
      { value: 'assigned', label: '已分配' },
      { value: 'processing', label: '处理中' },
      { value: 'parts_request', label: '配件申请中' },
      { value: 'parts_sent', label: '配件已发出' },
      { value: 'parts_return_approval', label: '待审批' },
      { value: 'parts_received', label: '返件已收到' }
    ],
    // 删除功能相关
    isEditMode: false,
    selectedIssues: []
  },

  onLoad(options) {
    this.initPage();
    this.loadWorkers();
    this.loadAssignedIssues();
  },

  onShow() {
    this.loadAssignedIssues();
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

  // 加载已分配问题
  async loadAssignedIssues() {
    if (this.data.isLoading) return;
    
    try {
      this.setData({ isLoading: true });
      
      console.log('📋 开始加载已分配问题...');
      console.log('📋 当前页面状态:', {
        currentPage: this.data.currentPage,
        pageSize: this.data.pageSize,
        selectedWorker: this.data.selectedWorker,
        selectedWorkerId: this.data.selectedWorkerId,
        现有issues数量: this.data.issues.length
      });
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数获取真实数据
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getAssignedIssues',
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          workerId: this.data.selectedWorker,
          selectedStatus: this.data.selectedStatus,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取已分配问题，原始数据:', data);
        console.log('✅ data 类型:', typeof data, '是对象?', data instanceof Object);
        console.log('✅ data.data 类型:', typeof data.data, '是数组?', Array.isArray(data.data));
        
        // data 的结构是 { data: [...], total: number, page: number, pageSize: number, errMsg: "..." }
        const newIssues = data.data || [];
        console.log('✅ 解析后的问题列表:', newIssues.length, '条, 总数:', data.total);
        console.log('✅ newIssues[0]:', newIssues[0]);
        
        const issues = this.data.currentPage === 1 ? newIssues : [...this.data.issues, ...newIssues];
        
        console.log('✅ 准备 setData - issues:', issues.length, '条, total:', data.total || 0);
        
        this.setData({
          issues: issues,
          total: data.total || 0,
          hasMore: newIssues.length === this.data.pageSize
        });
        
        console.log(`📋 setData 完成！当前状态:`);
        console.log(`   - this.data.issues.length: ${this.data.issues.length}`);
        console.log(`   - this.data.total: ${this.data.total}`);
        console.log(`   - this.data.hasMore: ${this.data.hasMore}`);
        console.log(`   - this.data.isLoading: ${this.data.isLoading}`);
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载已分配问题失败:', error);
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

  // 重新分配维修工
  onReassignWorker(e) {
    const issueId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/manager/assign-worker/assign-worker?id=${issueId}&reassign=true`
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
    this.loadAssignedIssues();
  },

  // 获取状态文本
  getStatusText(status) {
    const map = {
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
      'assigned': '#1890ff',
      'processing': '#fa8c16',
      'resolved': '#52c41a',
      'closed': '#666',
      'cancelled': '#f44336'
    };
    return map[status] || '#666';
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
    this.loadAssignedIssues();
    wx.stopPullDownRefresh();
  },

  // 上拉加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this.loadAssignedIssues();
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

  // 开始处理（主管代替维修工操作）
  startProcessing(e) {
    const issueId = e.currentTarget.dataset.id;
    // 跳转到发件确认页面
    wx.navigateTo({
      url: `/pages/manager/start-processing/start-processing?issueId=${issueId}`
    });
  },

  // 发送提醒
  sendReminder(e) {
    const issue = e.currentTarget.dataset.issue;
    wx.showModal({
      title: '提示',
      content: `确定发送提醒给维修工 ${issue.assignedWorkerName} 吗？`,
      success: (res) => {
        if (res.confirm) {
          // 这里可以调用云函数发送提醒
          wx.showToast({
            title: '提醒已发送',
            icon: 'success'
          });
        }
      }
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
    this.loadAssignedIssues();
  },

  // 状态筛选
  onStatusChange(e) {
    const index = e.detail.value;
    const status = this.data.statuses[index];
    this.setData({
      selectedStatusIndex: index,
      selectedStatus: status.value,
      currentPage: 1,
      issues: []
    });
    this.loadAssignedIssues();
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
        
        // 刷新列表
        this.setData({
          currentPage: 1,
          issues: []
        });
        this.loadAssignedIssues();
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
              
              // 刷新列表
              this.setData({
                currentPage: 1,
                issues: []
              });
              this.loadAssignedIssues();
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
        
        this.loadAssignedIssues();
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