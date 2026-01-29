// pages/worker/myInventory/myInventory.js
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
        hasMore: true,
        stats: {
            total: 0,
            installed: 0,
            uninstalled: 0
        }
    },

    onLoad(options) {
        this.loadOutboundList();
        this.loadStats();
    },

    // 加载统计信息
    async loadStats() {
        const app = getApp();
        try {
            // 1. 获取库存总数 (由经销商出库给维修工的总数)
            const outboundRes = await app.apiRequest('/erp/xiaoshouDetail/myOutboundList', 'GET', {
                pageNum: 1,
                pageSize: 1
            });

            // 2. 获取已安装数 (维修工提交并审核通过的安装记录总数)
            const installRes = await app.apiRequest('/pro/installRecord/list', 'GET', {
                pageNum: 1,
                pageSize: 1
            });

            const total = outboundRes.total || 0;
            const installed = installRes.total || 0;

            this.setData({
                stats: {
                    total: total,
                    installed: installed,
                    uninstalled: Math.max(0, total - installed)
                }
            });
        } catch (error) {
            console.error('加载统计失败:', error);
        }
    },

    // 加载出库记录
    async loadOutboundList(isLoadMore = false) {
        if (this.data.loading) return;
        if (isLoadMore && !this.data.hasMore) return;

        this.setData({ loading: true });
        const app = getApp();

        try {
            const res = await app.apiRequest('/erp/xiaoshouDetail/myOutboundList', 'GET', {
                pageNum: this.data.pageNum,
                pageSize: this.data.pageSize
            });

            if (res && res.code === 200) {
                const newRecords = res.rows.map(item => ({
                    id: item.id,
                    sn: item.barCode,
                    customerName: item.businessName,
                    psNo: item.psNo,
                    userPhone: item.repairPhone,
                    activationDate: item.outboundTime || item.saleDate,
                    status: '已出库',
                    statusType: 'success',
                    repairName: item.repairName,
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
            this.loadOutboundList().then(() => {
                wx.stopPullDownRefresh();
            });
        });
    },

    onReachBottom() {
        if (this.data.hasMore) {
            this.setData({
                pageNum: this.data.pageNum + 1
            }, () => {
                this.loadOutboundList(true);
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
            if (!a.activationDate || !b.activationDate) return 0;
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
