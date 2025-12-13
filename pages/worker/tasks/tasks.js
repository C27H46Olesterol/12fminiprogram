// pages/worker/tasks/tasks.js
const app = getApp();

Page({
  data: {
    priorityFilter: 'all',  // 优先级筛选：all, high, medium, low
    statusFilter: 'pending',  // 状态筛选：pending, processing, completed
    tasks: [],
    filteredTasks: [],
    isLoadingMore: false,
    hasMore: true,
    hasPendingTasks: false,  // 是否有待处理任务（用于显示小红点）
    currentPage: 1,
    pageSize: 10
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      // 如果有特定任务ID，直接跳转到详情
      this.goToTaskDetail(id);
    }
    this.loadTasks();
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
      tasks: []
    });
    this.loadTasks();
  },

  // 加载任务列表
  async loadTasks() {
    try {
      if (this.data.currentPage === 1) {
        app.showLoading('加载中...');
      }

      console.log('🔧 开始加载维修工任务...');
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数获取真实数据
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getMyTasks',
          page: this.data.currentPage,
          pageSize: this.data.pageSize,
          phoneNumber: phoneNumber
        }
      });

      console.log('🔧 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取维修工任务:', data);
        console.log('📋 原始任务数据:', JSON.stringify(data.data || []));
        
        // 转换数据格式，统一字段名
        const newTasks = (data.data || []).map(task => ({
          ...task,
          id: task._id,  // ✅ 使用数据库的真实 _id
          issueId: task.issueId,  // 保留业务ID用于显示
          title: task.title || '无标题',
          description: task.description || '',
          status: task.status || 'assigned',
          priority: task.priority || 'medium',
          clientName: task.clientName || '未知',
          clientPhone: task.clientPhone || '',
          contactPhoneData: task.contactPhoneData || task.clientPhone || '',
          assignTime: this.formatTime(task.assignedTime || task.createTime)
        }));
        const allTasks = this.data.currentPage === 1 ? newTasks : [...this.data.tasks, ...newTasks];
        
        console.log('📋 转换后的任务:', JSON.stringify(newTasks));
        
        this.setData({
          tasks: allTasks,
          hasMore: newTasks.length === this.data.pageSize
        });
        
        this.filterTasks();
        console.log(`🔧 加载完成: ${allTasks.length} 个任务`);
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        // 失败时使用模拟数据作为备用
        await this.loadFallbackData();
      }
      
    } catch (error) {
      console.error('❌ 加载任务失败:', error);
      // 出错时使用模拟数据作为备用
      await this.loadFallbackData();
    } finally {
      app.hideLoading();
      this.setData({ isLoadingMore: false });
    }
  },

  // 备用数据（当云函数调用失败时）
  async loadFallbackData() {
    console.log('🔄 使用备用模拟数据...');
    const result = await this.mockGetTasks();
    
    const newTasks = result.data;
    const allTasks = this.data.currentPage === 1 ? newTasks : [...this.data.tasks, ...newTasks];
    
    this.setData({
      tasks: allTasks,
      hasMore: result.hasMore
    });
    
    this.filterTasks();
  },

  // 模拟获取任务数据
  mockGetTasks() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData = [
          {
            id: 'T001',
            title: '空调制冷效果差',
            description: '驻车空调开启后制冷效果不明显，温度下降很慢，已经影响正常使用。',
            status: 'assigned',
            statusText: '已分配',
            priority: 'high',
            priorityText: '非常紧急',
            customerName: '张先生',
            customerPhone: '138****8888',
            assignTime: '2024-01-15 14:30'
          },
          {
            id: 'T002',
            title: '空调异响问题',
            description: '空调运行时出现异常噪音，影响休息，特别是在夜间。',
            status: 'in_progress',
            statusText: '进行中',
            priority: 'medium',
            priorityText: '紧急',
            customerName: '王先生',
            customerPhone: '139****9999',
            assignTime: '2024-01-10 09:15'
          },
          {
            id: 'T003',
            title: '空调无法启动',
            description: '按下开关后空调没有任何反应，指示灯也不亮。',
            status: 'assigned',
            statusText: '已分配',
            priority: 'high',
            priorityText: '非常紧急',
            customerName: '李女士',
            customerPhone: '137****7777',
            assignTime: '2024-01-16 08:45'
          },
          {
            id: 'T004',
            title: '温度控制不准确',
            description: '设置的温度与实际温度相差较大，无法精确控制。',
            status: 'in_progress',
            statusText: '进行中',
            priority: 'low',
            priorityText: '一般',
            customerName: '赵女士',
            customerPhone: '136****6666',
            assignTime: '2024-01-14 16:20'
          }
        ];

        const { currentPage, pageSize } = this.data;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageData = mockData.slice(startIndex, endIndex);
        
        resolve({
          data: pageData,
          hasMore: endIndex < mockData.length
        });
      }, 1000);
    });
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

  // 筛选任务
  filterTasks() {
    const { tasks, priorityFilter, statusFilter } = this.data;
    
    let filtered = tasks.filter(item => {
      // 优先级筛选
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false;
      }
      
      // 状态筛选（始终生效）
      if (statusFilter === 'pending') {
        // 待处理：已分配状态
        return item.status === 'assigned';
      } else if (statusFilter === 'processing') {
        // 进行中：处理中、配件申请中、配件已发出、待审批等
        return item.status === 'processing' || 
               item.status === 'parts_request' || 
               item.status === 'parts_sent' || 
               item.status === 'parts_return_approval' || 
               item.status === 'parts_received';
      } else if (statusFilter === 'completed') {
        // 已完成
        return item.status === 'completed';
      }
      
      return true;
    });
    
    // 按优先级和时间排序
    filtered.sort((a, b) => {
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority || 'low'] - priorityOrder[a.priority || 'low'];
      if (priorityDiff !== 0) return priorityDiff;
      
      // 同优先级按时间倒序
      const timeA = a.assignedTime || a.createTime || 0;
      const timeB = b.assignedTime || b.createTime || 0;
      return timeB - timeA;
    });
    
    // 检查是否有待处理任务
    const hasPending = tasks.some(item => item.status === 'assigned');
    
    this.setData({ 
      filteredTasks: filtered,
      hasPendingTasks: hasPending
    });
  },

  // 优先级筛选
  onPriorityFilter(e) {
    const priority = e.currentTarget.dataset.priority;
    this.setData({ 
      priorityFilter: priority
    });
    this.filterTasks();
  },

  // 状态筛选
  onStatusFilter(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ statusFilter: status });
    this.filterTasks();
  },

  // 开始处理任务
  onStartProcessing(e) {
    const taskId = e.currentTarget.dataset.id;
    
    // ✅ 跳转到开始处理页面，让维修工选择是否需要配件（与主管流程一致）
    wx.navigateTo({
      url: `/pages/worker/start-processing/start-processing?taskId=${taskId}`
    });
  },

  // 查看任务详情
  onViewTask(e) {
    const taskId = e.currentTarget.dataset.id;
    this.goToTaskDetail(taskId);
  },

  // 跳转到任务详情
  goToTaskDetail(taskId) {
    wx.navigateTo({
      url: `/pages/worker/task-detail/task-detail?id=${taskId}`
    });
  },

  // 申请发出配件（维修工需要申请）
  onRequestParts(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/worker/request-parts/request-parts?taskId=${taskId}`
    });
  },

  // 发出配件（旧方法，保留兼容性）
  onSendParts(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/worker/send-parts/send-parts?taskId=${taskId}`
    });
  },

  // 发出返件
  onReturnParts(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/worker/return-parts/return-parts?id=${taskId}`
    });
  },

  // 完成任务
  onCompleteTask(e) {
    const taskId = e.currentTarget.dataset.id;
    // 跳转到任务详情页面，让用户在详情页面完成任务
    wx.navigateTo({
      url: `/pages/worker/task-detail/task-detail?id=${taskId}`
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
    
    this.loadTasks();
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