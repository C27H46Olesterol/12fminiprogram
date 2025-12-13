// pages/client/product-news/product-news.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeTab: 'news', // 默认选中企业动态
    // 产品数据
    productList: [
      {
        id: 1,
        model: 'Pixel 8 Pro',
        image: 'cloud://cloud1-5ga6xyav93b12d47.636c-cloud1-5ga6xyav93b12d47-1386774416/avtm/12f-p1.jpg',
        price: '6999',
        isNew: true
      },
      {
        id: 2,
        model: 'Pixel 8',
        image: 'cloud://cloud1-5ga6xyav93b12d47.636c-cloud1-5ga6xyav93b12d47-1386774416/avtm/12f-p2.jpg',
        price: '4999',
        isNew: false
      },
      {
        id: 3,
        model: 'Pixel Watch 2',
        image: '',
        price: '2499',
        isNew: true
      },
      {
        id: 4,
        model: 'Pixel Buds Pro',
        image: '',
        price: '1299',
        isNew: false
      }
    ],
    // 新闻数据 - 匹配设计图
    newsList: [
      {
        id: 1,
        title: '2024 年度开发者大会',
        desc: '诚邀您参加我们的年度技术盛会，探索最新科技前沿。',
        image: 'cloud://cloud1-5ga6xyav93b12d47.636c-cloud1-5ga6xyav93b12d47-1386774416/avtm/12f-p1.jpg', // 示例图
        type: '活动',
        typeClass: 'activity', // 对应样式类
        date: '2023-10-15',
        views: 1241,
        likes: 350,
        comments: 1
      },
      {
        id: 2,
        title: '关于延长质保服务的最新政策',
        desc: '针对特定机型，我们将免费延长3个月质保服务。',
        image: '', // 无图
        type: '政策',
        typeClass: 'policy',
        date: '2023-11-01',
        views: 5600,
        likes: 890,
        comments: 0
      },
      {
        id: 3,
        title: '新一代智能家居中枢发布',
        desc: '更强大的连接能力，更智能的控制体验。',
        image: 'cloud://cloud1-5ga6xyav93b12d47.636c-cloud1-5ga6xyav93b12d47-1386774416/avtm/12f-p2.jpg',
        type: '新闻',
        typeClass: 'news',
        date: '2023-11-05',
        views: 3200,
        likes: 560,
        comments: 12
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }
  },

  /**
   * 切换 Tab
   */
  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
  },

  /**
   * 点击产品
   */
  onProductTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: `查看产品 ${id}`,
      icon: 'none'
    });
  },

  /**
   * 点击新闻，进入详情
   */
  onNewsTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/client/news-detail/news-detail?id=${id}`
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})
