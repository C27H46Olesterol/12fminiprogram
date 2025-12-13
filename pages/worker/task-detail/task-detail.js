// pages/worker/task-detail/task-detail.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    task: null,
    history: [],
    isLoading: false,
    isProcessing: false,  // 🔒 防止重复点击
    showCompleteModal: false,
    resultDescription: '',
    showHelpModal: false,
    helpReason: ''
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ taskId: id });
      this.initPage();
      this.loadTaskDetail();
      
      // 🔍 监听数据变化（调试用）
      this.watch = setInterval(() => {
        if (this.data.task) {
          console.log('⏰ [定时检查] 当前任务状态:', this.data.task.status);
        }
      }, 5000); // 每5秒检查一次
    } else {
      wx.showToast({
        title: '缺少任务ID',
        icon: 'error'
      });
      wx.navigateBack();
    }
  },
  
  onUnload() {
    // 清理定时器
    if (this.watch) {
      clearInterval(this.watch);
    }
  },

  onShow() {
    this.loadTaskDetail();
  },

  /**
   * 供其他页面调用的刷新方法（统一接口）
   */
  async loadData() {
    console.log('📋 收到刷新请求，重新加载任务详情');
    if (this.data.taskId) {
      // 清除旧数据，强制重新渲染
      this.setData({
        task: null,
        history: []
      });
      
      // 延迟一下确保云函数已完成更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 重新加载
      await this.loadTaskDetail();
      console.log('✅ loadData 完成');
    }
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

  // 加载任务详情
  async loadTaskDetail() {
    try {
      this.setData({ isLoading: true });
      
      console.log('🔧 开始加载任务详情...');
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数获取任务详情
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: this.data.taskId,
          phoneNumber: phoneNumber
        }
      });

      console.log('🔧 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取任务详情:', data);
        console.log('📊 当前任务状态:', data.issue?.status);
        console.log('📊 完整任务数据:', JSON.stringify(data.issue, null, 2));
        
        this.setData({
          task: data.issue,
          history: data.history || []
        });
        
        console.log('🔧 任务详情加载完成，当前状态:', this.data.task.status);
        console.log('🔧 页面数据状态:', JSON.stringify(this.data.task, null, 2));
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载任务详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 开始处理任务
  async onStartTask() {
    console.log('📋 任务详情页 - 点击开始处理按钮');
    
    // 🔒 防止重复点击
    if (this.data.isProcessing) {
      console.log('⚠️ 正在处理中，忽略重复点击');
      return;
    }
    
    // 🔒 检查当前状态
    if (this.data.task.status !== 'assigned') {
      console.log('⚠️ 任务状态不是 assigned，当前状态:', this.data.task.status);
      wx.showToast({
        title: '任务状态已改变',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到开始处理页面，让维修工选择是否需要配件
    wx.navigateTo({
      url: `/pages/worker/start-processing/start-processing?taskId=${this.data.taskId}`
    });
  },

  /**
   * 维修工申请发出配件
   */
  onRequestParts() {
    wx.navigateTo({
      url: `/pages/worker/request-parts/request-parts?taskId=${this.data.taskId}`
    });
  },

  /**
   * 发出返件
   */
  onReturnParts() {
    wx.navigateTo({
      url: `/pages/worker/return-parts/return-parts?id=${this.data.taskId}`
    });
  },


  // 显示完成任务弹窗
  onShowCompleteModal() {
    this.setData({ 
      showCompleteModal: true,
      resultDescription: ''
    });
  },

  // 隐藏完成任务弹窗
  onHideCompleteModal() {
    this.setData({ 
      showCompleteModal: false,
      resultDescription: ''
    });
  },

  // 输入处理结果
  onResultDescriptionInput(e) {
    this.setData({ resultDescription: e.detail.value });
  },

  // 确认完成任务
  async onConfirmComplete() {
    if (!this.data.resultDescription.trim()) {
      wx.showToast({
        title: '请输入处理结果',
        icon: 'error'
      });
      return;
    }

    // 🔒 防止重复点击
    if (this.data.isProcessing) {
      console.log('⚠️ 正在处理中，忽略重复点击');
      return;
    }
    
    // 🔒 检查当前状态
    if (this.data.task.status !== 'processing') {
      console.log('⚠️ 任务状态不是 processing，当前状态:', this.data.task.status);
      wx.showToast({
        title: '任务状态已改变',
        icon: 'none'
      });
      return;
    }

    // 🔒 设置处理中标志
    this.setData({ isProcessing: true });

    try {
      app.showLoading('处理中...');
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'completeTask',
          taskId: this.data.taskId,
          resultDescription: this.data.resultDescription,
          phone: phoneNumber,  // ✅ 传递手机号
          phoneNumber: phoneNumber  // ✅ 兼容不同参数名
        }
      });

      if (result.result && result.result.success) {
        // ✅ 立即更新本地状态
        this.setData({
          'task.status': 'resolved',
          'task.resolvedTime': new Date(),
          'task.resultDescription': this.data.resultDescription
        });
        
        console.log('✅ 本地状态已更新为 resolved');
        
        wx.showToast({
          title: '任务已完成',
          icon: 'success'
        });
        this.onHideCompleteModal();
        
        // 然后重新加载完整数据
        await this.loadTaskDetail();
      } else {
        throw new Error(result.result?.message || '完成任务失败');
      }
    } catch (error) {
      console.error('完成任务失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    } finally {
      app.hideLoading();
      // 🔒 解除处理中标志
      this.setData({ isProcessing: false });
    }
  },

  // 显示申请协助弹窗
  onShowHelpModal() {
    this.setData({ 
      showHelpModal: true,
      helpReason: ''
    });
  },

  // 隐藏申请协助弹窗
  onHideHelpModal() {
    this.setData({ 
      showHelpModal: false,
      helpReason: ''
    });
  },

  // 输入协助原因
  onHelpReasonInput(e) {
    this.setData({ helpReason: e.detail.value });
  },

  // 确认申请协助
  async onConfirmHelp() {
    if (!this.data.helpReason.trim()) {
      wx.showToast({
        title: '请输入协助原因',
        icon: 'error'
      });
      return;
    }

    try {
      app.showLoading('处理中...');
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'requestAssistance',
          taskId: this.data.taskId,
          reason: this.data.helpReason,
          phone: phoneNumber,  // ✅ 传递手机号
          phoneNumber: phoneNumber  // ✅ 兼容不同参数名
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: '协助申请已提交',
          icon: 'success'
        });
        this.onHideHelpModal();
        this.loadTaskDetail();
      } else {
        throw new Error(result.result?.message || '申请协助失败');
      }
    } catch (error) {
      console.error('申请协助失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'error'
      });
    } finally {
      app.hideLoading();
    }
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

  // 查看图片
  onPreviewImage(e) {
    const current = e.currentTarget.dataset.src;
    const urls = this.data.task?.images || [];
    
    wx.previewImage({
      current,
      urls
    });
  },

  // 查看返件图片
  onPreviewPartsImage(e) {
    const current = e.currentTarget.dataset.src;
    const urls = e.currentTarget.dataset.urls || this.data.task?.partsImages || [];
    
    wx.previewImage({
      current,
      urls
    });
  },

  // 拨打电话
  onCallPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      });
    }
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

  // 获取评分颜色
  getRatingColor(rating) {
    const map = {
      1: '#f5222d',
      2: '#fa8c16',
      3: '#faad14',
      4: '#52c41a',
      5: '#1890ff'
    };
    return map[rating] || '#999';
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadTaskDetail();
    wx.stopPullDownRefresh();
  }
});