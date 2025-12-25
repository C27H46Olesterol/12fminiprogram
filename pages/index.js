// pages/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 轮播图数据 (模拟新品展示)
    banners: [
      {
        id: 1,
        image: '/images/logo.png', // 暂用logo代替，实际应为产品图
        title: '全新一代智能驻车空调，强劲制冷'
      },
      {
        id: 2,
        image: '/images/logo.png',
        title: '静音舒适，节能省电，卡车司机首选'
      },
      {
        id: 3,
        image: '/images/logo.png',
        title: '夏季大促，以旧换新火热进行中'
      }
    ],

    // 公司动态数据
    newsList: [
      {
        id: 1,
        title: '颐尔福2025年度新品发布会圆满落幕',
        summary: '多款革命性驻车空调产品亮相，定义行业新标准。',
        date: '2025-05-20',
        image: '/images/logo.png'
      },
      {
        id: 2,
        title: '关于夏季售后服务升级的公告',
        summary: '全国网点24小时待命，为您清凉护航。',
        date: '2025-06-01',
        image: '/images/logo.png'
      },
      {
        id: 3,
        title: '如何正确保养您的驻车空调？专家支招',
        summary: '定期清洗滤网，检查线路，延长设备寿命。',
        date: '2025-06-15',
        image: '/images/logo.png'
      },
      {
        id: 4,
        title: '颐尔福荣获“年度最受卡友欢迎品牌”奖',
        summary: '感谢每一位用户的信赖与支持。',
        date: '2025-07-01',
        image: '/images/logo.png'
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 更新自定义 TabBar 状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
  },

  /**
   * 点击新闻
   */
  onNewsTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '查看详情: ' + id,
      icon: 'none'
    });
    // wx.navigateTo({ url: '/pages/news/detail?id=' + id })
  },
  
  // ... 其他生命周期函数
})
