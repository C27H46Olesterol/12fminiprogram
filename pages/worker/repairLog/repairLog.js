// pages/worker/repairLog/repairLog.js
Page({
  data: {
    searchQuery: '',
    filterDate: '',
    sortOrder: 'desc',
    records: [
      {
        id: '1',
        sn: 'SN123456789',
        licensePlate: '粤B88888',
        userPhone: '138****0001',
        repairDate: '2025-12-25 15:30',
        status: '维修完成',
        statusType: 'success',
        faultDescription: '空调不制冷，检查为压缩机启动电容损坏',
        location: '广东省深圳市南山区某街道',
        beforeImages: ['https://via.placeholder.com/150'],
        afterImages: ['https://via.placeholder.com/150'],
        expanded: false
      },
      {
        id: '2',
        sn: 'SN987654321',
        licensePlate: '粤A66666',
        userPhone: '139****2222',
        repairDate: '2025-12-26 11:15',
        status: '配件申请中',
        statusType: 'warning',
        faultDescription: '显示屏报E5故障，需更换主板',
        location: '广东省广州市天河区某中心',
        beforeImages: ['https://via.placeholder.com/150', 'https://via.placeholder.com/150'],
        afterImages: [],
        expanded: false
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
        item.userPhone.toLowerCase().includes(searchQuery) ||
        item.faultDescription.toLowerCase().includes(searchQuery);

      const matchDate = !filterDate || item.repairDate.startsWith(filterDate);

      return matchKeyword && matchDate;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.repairDate.replace(/-/g, '/'));
      const dateB = new Date(b.repairDate.replace(/-/g, '/'));
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