// pages/worker/activateLog/activateLog.js
Page({
  data: {
    searchQuery: '',
    filterDate: '',
    sortOrder: 'desc', // 'desc' or 'asc'
    records: [
      {
        id: '1',
        sn: 'SN123456789',
        licensePlate: '粤B88888',
        userPhone: '138****0001',
        activationDate: '2025-12-25 10:30',
        status: '审核通过',
        statusType: 'success',
        location: '广东省深圳市南山区某街道',
        processImages: ['https://via.placeholder.com/150', 'https://via.placeholder.com/150'],
        finishImages: ['https://via.placeholder.com/150'],
        expanded: false
      },
      {
        id: '2',
        sn: 'SN987654321',
        licensePlate: '粤A66666',
        userPhone: '139****2222',
        activationDate: '2025-12-26 14:15',
        status: '待审核',
        statusType: 'warning',
        location: '广东省广州市天河区某中心',
        processImages: ['https://via.placeholder.com/150'],
        finishImages: ['https://via.placeholder.com/150', 'https://via.placeholder.com/150'],
        expanded: false
      },
      {
        id: '3',
        sn: 'SN55556666',
        licensePlate: '浙A77777',
        userPhone: '135****3333',
        activationDate: '2025-12-20 09:00',
        status: '驳回重传',
        statusType: 'error',
        location: '浙江省杭州市西湖区',
        processImages: ['https://via.placeholder.com/150'],
        finishImages: ['https://via.placeholder.com/150'],
        expanded: false,
        remark: '安装完照模糊，请重新上传'
      }
    ],
    filteredRecords: []
  },

  onLoad(options) {
    this.filterRecords();
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
        item.licensePlate.toLowerCase().includes(searchQuery) ||
        item.userPhone.toLowerCase().includes(searchQuery);

      const matchDate = !filterDate || item.activationDate.startsWith(filterDate);

      return matchKeyword && matchDate;
    });

    // 排序
    filtered.sort((a, b) => {
      const dateA = new Date(a.activationDate.replace(/-/g, '/'));
      const dateB = new Date(b.activationDate.replace(/-/g, '/'));
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