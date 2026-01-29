// pages/worker/activateLog/activateLog.js
Page({
  data: {
    searchQuery: '',
    filterDate: '',
    sortOrder: 'desc', // 'desc' or 'asc'
    records: [],
    filteredRecords: [],
    total: 0,
    pageNum: 1,
    pageSize: 10,
    loading: false,
    hasMore: true
  },

  onLoad(options) {
    this.loadInstallRecords();
  },

  // 加载安装记录
  async loadInstallRecords(isLoadMore = false) {
    if (this.data.loading) return;
    if (isLoadMore && !this.data.hasMore) return;

    this.setData({ loading: true });
    const app = getApp();

    try {
      const res = await app.apiRequest('/pro/installRecord/list', 'GET', {
        pageNum: this.data.pageNum,
        pageSize: this.data.pageSize
      });

      if (res && (res.code === 200 || res.code === 0)) {
        const newRecords = res.rows.map(item => ({
          id: item.id,
          sn: item.productSn,
          licensePlate: item.licensePlate,
          driverPhone: item.driverPhone,
          customerPhone: item.customerPhone,
          installTime: item.installTime,
          status: item.installStatus === '1' ? '已完成' : '进行中',
          statusType: item.installStatus === '1' ? 'success' : 'warning',
          remark: item.remark,
          processImages: item.installProcessPhotos ? item.installProcessPhotos.split(',') : [],
          finishImages: item.installCompletePhotos ? item.installCompletePhotos.split(',') : [],
          expanded: false
        }));

        const records = isLoadMore ? [...this.data.records, ...newRecords] : newRecords;

        this.setData({
          records: records,
          total: res.total,
          loading: false,
          hasMore: records.length < res.total
        }, () => {
          this.filterRecords();
        });
      } else {
        wx.showToast({ title: res.msg || '查询失败', icon: 'none' });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('加载列表失败:', error);
      this.setData({ loading: false });
    }
  },

  onPullDownRefresh() {
    this.setData({
      pageNum: 1,
      hasMore: true,
      records: []
    }, () => {
      this.loadInstallRecords().then(() => {
        wx.stopPullDownRefresh();
      });
    });
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({
        pageNum: this.data.pageNum + 1
      }, () => {
        this.loadInstallRecords(true);
      });
    }
  },

  onSearch(e) {
    this.setData({ searchQuery: e.detail.value.toLowerCase() }, () => {
      this.filterRecords();
    });
  },

  onDateFilterChange(e) {
    this.setData({ filterDate: e.detail.value }, () => {
      this.filterRecords();
    });
  },

  clearDateFilter() {
    this.setData({ filterDate: '' }, () => {
      this.filterRecords();
    });
  },

  toggleSort() {
    this.setData({
      sortOrder: this.data.sortOrder === 'desc' ? 'asc' : 'desc'
    }, () => {
      this.filterRecords();
    });
  },

  filterRecords() {
    const { records, searchQuery, filterDate, sortOrder } = this.data;

    let filtered = records.filter(item => {
      const matchKeyword = !searchQuery ||
        item.sn.toLowerCase().includes(searchQuery) ||
        (item.customerName && item.customerName.toLowerCase().includes(searchQuery)) ||
        item.userPhone.includes(searchQuery);

      const matchDate = !filterDate || (item.activationDate && item.activationDate.startsWith(filterDate));

      return matchKeyword && matchDate;
    });

    // 排序
    filtered.sort((a, b) => {
      if (!a.installTime || !b.installTime) return 0;
      const dateA = new Date(a.installTime.replace(/-/g, '/'));
      const dateB = new Date(b.installTime.replace(/-/g, '/'));
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    this.setData({ filteredRecords: filtered });
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id;
    const records = this.data.filteredRecords.map(item => {
      if (item.id === id) {
        return { ...item, expanded: !item.expanded };
      }
      return item;
    });
    this.setData({
      filteredRecords: records
    });
  },

  previewImage(e) {
    const { url, images } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: images
    });
  }
})