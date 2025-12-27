// pages/client/devices/devices.js
Page({
    data: {
        devices: [
            {
                id: '1',
                name: '顶置空调 D3000',
                sn: 'SN202312010001',
                installDate: '2023-12-01',
                warrantyDate: '2024-12-01',
                imageUrl: '/images/icons/desk.png' // 占位图，实际建议使用产品图
            },
            {
                id: '2',
                name: '驻车加热器 F100',
                sn: 'SN202306150024',
                installDate: '2023-06-15',
                warrantyDate: '2025-06-15',
                imageUrl: '/images/icons/desk.png'
            },
            {
                id: '3',
                name: '分体空调 S200',
                sn: 'SN202201100555',
                installDate: '2022-01-10',
                warrantyDate: '2023-01-10',
                imageUrl: '/images/icons/desk.png'
            }
        ],
        displayDevices: []
    },

    onLoad() {
        this.processDevices();
    },

    processDevices() {
        const now = new Date();
        const processed = this.data.devices.map(item => {
            const wDate = new Date(item.warrantyDate.replace(/-/g, '/'));
            const isExpired = now > wDate;

            return {
                ...item,
                warrantyStatus: isExpired ? '已过保' : '保修中',
                statusType: isExpired ? 'expired' : 'active'
            };
        });

        this.setData({
            displayDevices: processed
        });
    },

    handleShowDetail(e) {
        const sn = e.currentTarget.dataset.sn;
        // 未来可以跳转到设备详情或报修页面
        wx.showActionSheet({
            itemList: ['查看详情', '故障报修'],
            success: (res) => {
                if (res.tapIndex === 1) {
                    wx.navigateTo({
                        url: `/pages/client/issues/issues?sn=${sn}`
                    });
                }
            }
        });
    }
})
