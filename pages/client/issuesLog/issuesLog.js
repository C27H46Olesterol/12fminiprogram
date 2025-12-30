// pages/client/issuesLog/issuesLog.js
Page({
  data: {
    searchQuery: '',
    filterDate: '',
    sortOrder: 'desc',
    records: [
      {
        id: '1',
        sn: 'SN123456789',
        submitDate: '2025-12-25 09:00',
        status: '处理完成',
        statusType: 'success',
        description: '空调开机后噪音很大，伴有异味',
        images: ['https://via.placeholder.com/150'],
        feedback: '维修师傅于12-25 15:30完成维修，检查发现风轮卷入异物。',
        expanded: false
      },
      {
        id: '2',
        sn: 'SN987654321',
        submitDate: '2025-12-26 10:20',
        status: '待分配',
        statusType: 'warning',
        description: '显示屏不亮，无法通电',
        images: ['https://via.placeholder.com/150', 'https://via.placeholder.com/150'],
        feedback: '',
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
        item.description.toLowerCase().includes(searchQuery);

      const matchDate = !filterDate || item.submitDate.startsWith(filterDate);

      return matchKeyword && matchDate;
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.submitDate.replace(/-/g, '/'));
      const dateB = new Date(b.submitDate.replace(/-/g, '/'));
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