// pages/manager/personnel-manager/personnel-manager.js
const app = getApp();

Page({
  data: {
    // 维修工列表
    workers: [],
    
    // 地区筛选 - 自定义弹窗
    displayRegion: '全国',
    showRegionModal: false,
    selectedRegion: '',
    workerRegions: [], // 所有维修工的注册地区（去重）
    filteredWorkerRegions: [], // 搜索过滤后的地区列表
    regionSearchKeyword: '',
    
    // 筛选条件
    selectedProvince: '',
    selectedCity: '',
    searchKeyword: '',
    
    // 分页
    pageSize: 20,
    pageNum: 1,
    hasMore: true,
    loading: false,
    totalCount: 0,
    
    // 空状态提示
    emptyTip: '暂无符合条件的维修工'
  },

  onLoad(options) {
    console.log('📋 维修工列表页面加载');
    this.initPage();
  },

  onShow() {
    // 每次显示时刷新数据
    this.loadWorkers(true);
  },

  // 初始化页面
  async initPage() {
    try {
      // 加载维修工列表（使用微信原生地区组件，无需手动初始化地区数据）
      await this.loadWorkers(true);
    } catch (error) {
      console.error('❌ 初始化页面失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },


  // 加载维修工列表
  async loadWorkers(refresh = false) {
    if (this.data.loading) return;
    
    try {
      this.setData({ loading: true });
      
      if (refresh) {
        this.setData({
          pageNum: 1,
          workers: [],
          hasMore: true
        });
      }

      console.log('📋 加载维修工列表 - 页码:', this.data.pageNum);
      console.log('  筛选条件:', {
        province: this.data.selectedProvince,
        city: this.data.selectedCity,
        keyword: this.data.searchKeyword
      });

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getWorkerList',
          province: this.data.selectedProvince || '',
          city: this.data.selectedCity || '',
          keyword: this.data.searchKeyword || '',
          pageNum: this.data.pageNum,
          pageSize: this.data.pageSize
        }
      });

      console.log('📋 云函数返回结果:', result);

      if (result.result && result.result.success) {
        const { workers, total, hasMore } = result.result.data;
        
        console.log('✅ 获取成功:', workers.length, '个维修工，总数:', total);

        // 处理数据
        const processedWorkers = workers.map(worker => {
          // 计算注册天数
          const registerDate = new Date(worker.registerTime);
          const now = new Date();
          const diffDays = Math.floor((now - registerDate) / (1000 * 60 * 60 * 24));
          
          // 格式化注册时间
          const registerTimeText = this.formatDateTime(worker.registerTime);

          return {
            ...worker,
            registerDays: diffDays,
            registerTimeText: registerTimeText,
            isOnline: false // TODO: 实现在线状态检测
          };
        });

        // 合并数据（下拉刷新或加载更多）
        const newWorkers = refresh ? processedWorkers : [...this.data.workers, ...processedWorkers];

        // 如果是刷新，提取所有维修工的注册地区（去重）
        let updateData = {
          workers: newWorkers,
          totalCount: total,
          hasMore: hasMore,
          pageNum: this.data.pageNum + 1
        };

        if (refresh) {
          const workerRegions = [];
          processedWorkers.forEach(worker => {
            if (worker.region && !workerRegions.includes(worker.region)) {
              workerRegions.push(worker.region);
            }
          });
          // 排序
          workerRegions.sort();
          
          updateData.workerRegions = workerRegions;
          updateData.filteredWorkerRegions = workerRegions;
        }

        this.setData(updateData);

      } else {
        console.error('❌ 获取维修工列表失败:', result.result?.message);
        wx.showToast({
          title: result.result?.message || '获取失败',
          icon: 'none'
        });
      }

    } catch (error) {
      console.error('❌ 加载维修工列表失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 显示地区选择弹窗
  showRegionModal() {
    this.setData({
      showRegionModal: true,
      regionSearchKeyword: '',
      filteredWorkerRegions: this.data.workerRegions
    });
  },

  // 隐藏地区选择弹窗
  hideRegionModal() {
    this.setData({
      showRegionModal: false,
      regionSearchKeyword: ''
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，阻止点击弹窗内容时关闭弹窗
  },

  // 地区搜索输入
  onRegionSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ regionSearchKeyword: keyword });

    if (!keyword) {
      this.setData({ filteredWorkerRegions: this.data.workerRegions });
      return;
    }

    // 过滤地区列表
    const filtered = this.data.workerRegions.filter(region => {
      return region.includes(keyword);
    });

    this.setData({ filteredWorkerRegions: filtered });
  },

  // 选择地区（临时选择）
  selectRegion(e) {
    const region = e.currentTarget.dataset.region;
    this.setData({ selectedRegion: region });
  },

  // 确认地区选择
  confirmRegion() {
    const region = this.data.selectedRegion;
    const displayRegion = region === '' ? '全国' : region;

    // 从 region 中提取省市（格式：省-市）
    let province = '';
    let city = '';
    if (region) {
      const parts = region.split('-');
      province = parts[0] || '';
      city = parts[1] || '';
    }

    this.setData({
      displayRegion: displayRegion,
      selectedProvince: province,
      selectedCity: city,
      showRegionModal: false,
      regionSearchKeyword: ''
    });

    // 刷新列表
    this.loadWorkers(true);
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    
    // 清除之前的定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    
    // 设置新的定时器，实现防抖搜索
    this.searchTimer = setTimeout(() => {
      console.log('🔍 实时搜索:', keyword);
      this.loadWorkers(true);
    }, 500);
  },

  // 搜索确认
  onSearch() {
    console.log('🔍 搜索确认:', this.data.searchKeyword);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.loadWorkers(true);
  },

  // 清空搜索
  onClearSearch() {
    console.log('🔍 清空搜索');
    this.setData({
      searchKeyword: ''
    });
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.loadWorkers(true);
  },


  // 重置筛选
  onResetFilter() {
    console.log('🔄 重置筛选条件');
    
    this.setData({
      displayRegion: '全国',
      selectedProvince: '',
      selectedCity: '',
      selectedRegion: '',
      searchKeyword: ''
    });

    // 清除搜索定时器
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    // 刷新列表
    this.loadWorkers(true);
  },

  // 加载更多
  onLoadMore() {
    if (!this.data.hasMore || this.data.loading) {
      return;
    }
    this.loadWorkers(false);
  },

  // 查看维修工详情
  onViewWorkerDetail(e) {
    const workerId = e.currentTarget.dataset.id;
    console.log('👷 查看维修工详情:', workerId);
    
    wx.navigateTo({
      url: `/pages/manager/worker-detail/worker-detail?workerId=${workerId}`
    });
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
  },

  // 下拉刷新
  onPullDownRefresh() {
    console.log('🔄 下拉刷新');
    this.loadWorkers(true).then(() => {
      wx.stopPullDownRefresh();
    });
  }
});
