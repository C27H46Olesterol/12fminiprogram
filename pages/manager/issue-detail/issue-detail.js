// pages/manager/issue-detail/issue-detail.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    issue: null,
    history: [],
    isLoading: false,
    isRefreshing: false,  // 添加刷新标志，防止重复刷新
    showAssignModal: false,
    workers: [],
    filteredWorkers: [],
    workerSearchKeyword: '',
    selectedWorker: '',
    selectedWorkerId: '',
    showPriorityModal: false,
    selectedPriority: '',
    priorityOptions: ['低', '中', '高', '紧急'],
    priorityValues: ['low', 'medium', 'high', 'urgent'],
    showApproveModal: false,
    showRejectModal: false,
    approvalNote: '',
    rejectReason: ''
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ issueId: id });
      this.initPage();
      this.loadIssueDetail();
    } else {
      wx.showToast({
        title: '缺少问题ID',
        icon: 'error'
      });
      wx.navigateBack();
    }
  },

  onShow() {
    // 每次显示页面时都重新加载数据
    console.log('📋 页面 onShow 触发');
    if (this.data.issueId && !this.data.isRefreshing) {
      // 延迟一下，避免与 loadData 冲突
      setTimeout(() => {
        if (!this.data.isRefreshing) {
          console.log('📋 onShow 触发数据加载');
          this.loadIssueDetail();
        } else {
          console.log('⏸️ 正在刷新中，onShow 跳过加载');
        }
      }, 200);
    }
  },

  /**
   * 供其他页面调用的刷新方法
   */
  async loadData() {
    console.log('📋 收到刷新请求，重新加载工单详情');
    if (this.data.issueId) {
      // 清除旧数据，强制重新渲染
      this.setData({
        issue: null,
        history: []
      });
      
      // 延迟一下确保云函数已完成更新
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 重新加载
      await this.loadIssueDetail();
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

  // 将云存储 fileID 转换为临时 URL
  async convertFileIDsToUrls(fileIDs) {
    if (!fileIDs || fileIDs.length === 0) {
      return [];
    }

    try {
      const urlPromises = fileIDs.map(fileID => {
        return new Promise((resolve) => {
          // 如果已经是 http/https URL，直接使用
          if (fileID.startsWith('http://') || fileID.startsWith('https://')) {
            resolve(fileID);
            return;
          }

          // 否则通过云存储获取临时链接
          wx.cloud.getTempFileURL({
            fileList: [fileID],
            success: (res) => {
              if (res.fileList && res.fileList.length > 0 && res.fileList[0].tempFileURL) {
                resolve(res.fileList[0].tempFileURL);
              } else {
                console.error('获取临时链接失败:', fileID, res);
                resolve(fileID); // 降级处理，使用原 fileID
              }
            },
            fail: (err) => {
              console.error('getTempFileURL 失败:', fileID, err);
              resolve(fileID); // 降级处理，使用原 fileID
            }
          });
        });
      });

      const urls = await Promise.all(urlPromises);
      return urls;
    } catch (error) {
      console.error('转换图片 URL 失败:', error);
      return fileIDs; // 降级处理，返回原 fileIDs
    }
  },

  // 加载问题详情
  async loadIssueDetail() {
    // 防止重复刷新
    if (this.data.isRefreshing) {
      console.log('⏸️ 正在刷新中，跳过本次请求');
      return;
    }
    
    try {
      this.setData({ isLoading: true, isRefreshing: true });
      
      console.log('📋 开始加载问题详情...', 'issueId:', this.data.issueId);
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      console.log('📱 用户手机号:', phoneNumber);
      
      // 调用云函数获取问题详情
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: this.data.issueId,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 云函数调用结果:', JSON.stringify(result.result, null, 2));

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取问题详情:', {
          issueId: data.issue.issueId,
          status: data.issue.status,
          needParts: data.issue.needParts,
          partsDetail: data.issue.partsDetail,
          assignedWorkerName: data.issue.assignedWorkerName,
          images: data.issue.images,
          hasImages: !!data.issue.images,
          imagesLength: data.issue.images?.length || 0,
          reporterPhone: data.issue.reporterPhone
        });
        
        // 处理图片：将云存储 fileID 转换为临时 URL
        if (data.issue.images && data.issue.images.length > 0) {
          console.log('🖼️ 开始转换图片 fileID 为临时 URL...');
          const imageUrls = await this.convertFileIDsToUrls(data.issue.images);
          data.issue.imageUrls = imageUrls;
          console.log('✅ 图片 URL 转换完成:', imageUrls);
        }
        
        // 处理返件图片
        if (data.issue.partsImages && data.issue.partsImages.length > 0) {
          console.log('🖼️ 开始转换返件图片 fileID 为临时 URL...');
          const partsImageUrls = await this.convertFileIDsToUrls(data.issue.partsImages);
          data.issue.partsImageUrls = partsImageUrls;
          console.log('✅ 返件图片 URL 转换完成:', partsImageUrls);
        }
        
        this.setData({
          issue: data.issue,
          history: data.history || []
        });
        
        console.log('📋 页面数据已更新:', {
          status: this.data.issue.status,
          needParts: this.data.issue.needParts,
          images: this.data.issue.images,
          imageUrls: this.data.issue.imageUrls,
          imagesCount: this.data.issue.images?.length || 0
        });
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载问题详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false, isRefreshing: false });
    }
  },

  // 显示分配维修工弹窗
  async onShowAssignModal() {
    // 先显示加载提示
    wx.showLoading({ title: '加载维修工...' });
    
    // 加载维修工列表
    await this.loadWorkers();
    
    wx.hideLoading();
    
    // 显示弹窗
    this.setData({ showAssignModal: true });
  },

  // 隐藏分配维修工弹窗
  onHideAssignModal() {
    this.setData({ 
      showAssignModal: false,
      selectedWorker: '',
      selectedWorkerId: '',
      workerSearchKeyword: '',
      filteredWorkers: this.data.workers  // 重置过滤列表
    });
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
        console.log('✅ 获取到维修工列表:', workers);
        this.setData({ 
          workers,
          filteredWorkers: workers  // 初始化过滤后的列表
        });
      } else {
        console.error('❌ 获取维修工列表失败:', result.result);
      }
    } catch (error) {
      console.error('❌ 加载维修工列表失败:', error);
    }
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
  // 选择维修工（新的点击选择方式）
  onSelectWorker(e) {
    const workerId = e.currentTarget.dataset.id;
    const workerIndex = e.currentTarget.dataset.index;
    console.log('✅ 选择维修工 - ID:', workerId, '索引:', workerIndex);
    this.setData({ 
      selectedWorker: workerIndex,
      selectedWorkerId: workerId
    });
  },

  // 兼容旧的 picker 方式（如果还有其他地方使用）
  onWorkerChange(e) {
    const workerIndex = e.detail.value;
    const worker = this.data.workers[workerIndex];
    console.log('✅ 选择维修工 - 索引:', workerIndex, '维修工:', worker);
    this.setData({ 
      selectedWorker: workerIndex,
      selectedWorkerId: worker ? worker.workerId : ''
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
      app.showLoading('分配中...');
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      console.log('🔧 开始分配维修工:', {
        issueId: this.data.issueId,
        workerId: this.data.selectedWorkerId,
        phoneNumber: phoneNumber
      });
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'assignWorker',
          issueId: this.data.issueId,
          workerId: this.data.selectedWorkerId,
          phoneNumber: phoneNumber
        }
      });

      if (result.result && result.result.success) {
        wx.showToast({
          title: '分配成功',
          icon: 'success'
        });
        this.onHideAssignModal();
        this.loadIssueDetail();
      } else {
        wx.showToast({
          title: '分配失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 分配维修工失败:', error);
      wx.showToast({
        title: '分配失败',
        icon: 'error'
      });
    } finally {
      app.hideLoading();
    }
  },

  // 显示优先级设置弹窗
  onShowPriorityModal() {
    this.setData({ 
      showPriorityModal: true,
      selectedPriority: this.data.issue?.priority || 'medium'
    });
  },

  // 隐藏优先级设置弹窗
  onHidePriorityModal() {
    this.setData({ showPriorityModal: false });
  },

  // 选择优先级
  onPriorityChange(e) {
    const index = parseInt(e.detail.value);
    const selectedPriority = this.data.priorityValues[index];
    console.log('✅ 选择优先级 - 索引:', index, '优先级值:', selectedPriority);
    this.setData({ selectedPriority });
  },

  // 确认设置优先级
  async onConfirmPriority() {
    if (!this.data.selectedPriority) {
      wx.showToast({
        title: '请选择优先级',
        icon: 'error'
      });
      return;
    }

    try {
      app.showLoading('设置中...');
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      console.log('🔧 开始设置优先级:', {
        issueId: this.data.issueId,
        priority: this.data.selectedPriority,
        phoneNumber: phoneNumber
      });
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'setIssuePriority',
          issueId: this.data.issueId,
          priority: this.data.selectedPriority,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 设置优先级结果:', result);

      if (result.result && result.result.success) {
        wx.showToast({
          title: '设置成功',
          icon: 'success'
        });
        this.onHidePriorityModal();
        this.loadIssueDetail();
      } else {
        console.error('❌ 设置失败:', result.result?.message);
        wx.showToast({
          title: result.result?.message || '设置失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 设置优先级异常:', error);
      wx.showToast({
        title: '设置失败',
        icon: 'error'
      });
    } finally {
      app.hideLoading();
    }
  },

  // 开始处理（主管代替维修工操作）
  /**
   * 开始处理工单
   */
  onStartProcessing() {
    wx.navigateTo({
      url: `/pages/manager/start-processing/start-processing?issueId=${this.data.issueId}`
    });
  },

  /**
   * 发出配件
   */
  onSendParts() {
    wx.navigateTo({
      url: `/pages/manager/send-parts/send-parts?issueId=${this.data.issueId}`
    });
  },

  /**
   * 发出返件
   */
  onReturnParts() {
    wx.navigateTo({
      url: `/pages/manager/return-parts/return-parts?id=${this.data.issueId}`
    });
  },


  /**
   * 完成任务
   */
  onCompleteTask() {
    wx.navigateTo({
      url: `/pages/manager/complete-task/complete-task?issueId=${this.data.issueId}`
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const map = {
      'pending': '待处理',
      'assigned': '已分配',
      'processing': '处理中',
      'parts_request': '配件申请中',
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

  // 获取优先级索引
  getPriorityIndex(priority) {
    const index = this.data.priorityValues.indexOf(priority);
    return index >= 0 ? index : 1; // 默认返回"中"
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
    const urls = this.data.issue?.imageUrls || [];
    
    console.log('预览图片:', { current, urls });
    
    wx.previewImage({
      current,
      urls
    });
  },

  // 图片加载错误处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    console.error('图片加载失败:', {
      index,
      src: e.currentTarget.dataset.src,
      error: e.detail
    });
    
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },

  // 查看返件图片
  onPreviewPartsImage(e) {
    const current = e.currentTarget.dataset.src;
    const urls = e.currentTarget.dataset.urls || this.data.issue?.partsImageUrls || [];
    
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
    this.loadIssueDetail();
    wx.stopPullDownRefresh();
  },

  // 显示审批配件申请弹窗（同意）
  onApprovePartsRequest() {
    this.setData({
      showApproveModal: true,
      approvalNote: ''
    });
  },

  // 隐藏审批配件申请弹窗
  onHideApproveModal() {
    this.setData({
      showApproveModal: false,
      approvalNote: ''
    });
  },

  // 输入审批意见
  onApprovalNoteInput(e) {
    this.setData({
      approvalNote: e.detail.value
    });
  },

  // 确认同意配件申请
  async onConfirmApprove() {
    wx.showLoading({ title: '处理中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'approveParts',
          issueId: this.data.issueId,
          approvalNote: this.data.approvalNote,
          phoneNumber: phoneNumber
        }
      });

      if (res.result.success) {
        wx.showToast({
          title: '审批成功',
          icon: 'success'
        });
        this.onHideApproveModal();
        this.loadIssueDetail();
      } else {
        wx.showToast({
          title: res.result.message || '审批失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('❌ 审批配件申请失败:', error);
      wx.showToast({
        title: '审批失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 显示拒绝配件申请弹窗
  onRejectPartsRequest() {
    this.setData({
      showRejectModal: true,
      rejectReason: ''
    });
  },

  // 隐藏拒绝配件申请弹窗
  onHideRejectModal() {
    this.setData({
      showRejectModal: false,
      rejectReason: ''
    });
  },

  // 输入拒绝理由
  onRejectReasonInput(e) {
    this.setData({
      rejectReason: e.detail.value
    });
  },

  // 确认拒绝配件申请
  async onConfirmReject() {
    if (!this.data.rejectReason || !this.data.rejectReason.trim()) {
      wx.showToast({
        title: '请输入拒绝理由',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '处理中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'rejectParts',
          issueId: this.data.issueId,
          rejectReason: this.data.rejectReason.trim(),
          phoneNumber: phoneNumber
        }
      });

      if (res.result.success) {
        wx.showToast({
          title: '已拒绝申请',
          icon: 'success'
        });
        this.onHideRejectModal();
        this.loadIssueDetail();
      } else {
        wx.showToast({
          title: res.result.message || '操作失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('❌ 拒绝配件申请失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});