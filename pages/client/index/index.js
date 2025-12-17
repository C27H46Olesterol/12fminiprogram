// pages/client/index/index.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    userLocation: null, // 用户位置信息
    recentFeedbacks: [],
    myProducts: [], // 产品用户：已激活产品列表
    workerStats: {}, // 维修工：统计数据
    serviceStats: {}, // 售后服务角色：统计数据
    bannerList: [],  // 轮播图列表
    newsList: [], // 企业动态列表
    session_key: '', //微信登陆凭证
    deviceData: null,
    lastUpdateTime: '',
    openid: '' //用户唯一标识
  },

  onLoad() {
    console.log('加载页面')
    wx.showLoading();
    this.UserInfoStorageCheck();
    this.getUser();
    this.initPage();
    if (this.data.hasUserInfo) {
      this.loadRoleData(); // 加载角色专属数据
    } else {
      // 未登录时加载企业动态
      this.loadNewsList();
    }
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)
  },

  onShow() {
    wx.showLoading();
    console.log("显示client/index")
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    console.log('显示页面')
    this.initPage();
    if (this.data.hasUserInfo) {
      this.loadRoleData(); // 加载角色专属数据
    } else {
      // 未登录时加载企业动态
      this.loadNewsList();
    }
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)
    console.log("client/index加载完毕")
  },

  //缓存信息检查
  UserInfoStorageCheck() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      app.globalData.userInfo = userInfo;
    }
  },

  //持续登录实现
  checkUser() {
    if (session_key === '' && openid === '') {
      console.log('用户未登录');
      return []
    }
    wx.cloud.callFunction({

    })
  },

  getUser() {
    if (this.data.session_key === '' && this.data.openid === '') {
      //微信登陆，获取openid 和 session_key
      wx.login({
        success(res) {
          if (res.code) {
            wx.cloud.callFunction({
              name: 'auth',
              data: {
                action: 'userLoginCheck',
                code: res.code
              },
              success: function (result) {
                console.log('用户信息获取成功：', result.result);
                wx.setStorageSync('session_key', result.result.session_key)
                wx.setStorageSync('openid', result.result.openid)
              },
              fail: function (error) {
                console.log('获取用户登陆信息失败：', error);
                return [];
              },
            })

          } else {
            return { errMsg: '登陆失败！请检查网络' }
          }
        }
      })
    }
    else {
      wx.cloud.callFunction({
        name: '',
        data: {
          action: '',
        }
      })
    }


  },

  // 初始化页面
  initPage() {
    console.log('客户端首页初始化');
    const userInfo = app.globalData.userInfo;
    console.log('全局用户信息:', userInfo);

    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
      });

      //获取当前位置信息
      this.getCurrentLocation();
    } else {
      this.setData({
        hasUserInfo: false,
      });

      // 未登录时加载企业动态
      this.loadNewsList();
    }

    this.initBanner();
  },

  // 加载企业动态列表
  loadNewsList() {
    // 从产品动态页面复用数据
    const newsList = [
      {
        id: 1,
        title: '颐尔福亮相2025国际汽配展，展示最新驻车空调技术',
        desc: '本次展会我们带来了全新的智能变频系列产品，受到了国内外客户的广泛关注。',
        image: '',
        type: '展会活动',
        date: '2025-11-15'
      },
      {
        id: 2,
        title: '热烈欢迎华东区核心经销商莅临工厂参观考察',
        desc: '加强厂商合作，共谋市场发展，华东区经销商代表团一行20人来访。',
        image: '',
        type: '企业动态',
        date: '2025-10-20'
      },
      {
        id: 3,
        title: '冬季驻车空调保养小知识，延长使用寿命',
        desc: '随着气温下降，如何正确保养您的驻车空调？专家给出了这些建议...',
        image: '',
        type: '产品知识',
        date: '2025-10-01'
      }
    ];

    this.setData({ newsList });
  },

  // 加载角色专属数据
  async loadRoleData() {
    const userInfo = app.globalData.userInfo
    const role = userInfo.role;
    console.log('检测用户身份', role)
    if (role === 'client') {
      console.log('设置产品用户专用栏')
      // 加载已激活产品
      const myProductsList = await this.formatActivateProduct()

      this.setData({
        myProducts: myProductsList
      })
      this.loadRecentFeedbacks()

    } else if (role === 'worker') {
      // 加载维修工统计 (模拟数据)
      console.log('设置维修工专用栏')
      this.setData({
        workerStats: {
          pending: 3,
          processing: 1,
          todayIncome: 150
        }
      });
    } else if (role === 'service' || role === 'server') {
      // 加载售后服务角色统计 (模拟数据)
      console.log('设置售后服务角色专用栏')
      this.setData({
        serviceStats: {
          pending: 5,
          processing: 2,
          todayCompleted: 8
        }
      });
    }
  },

  //加载用户已激活产品
  async formatActivateProduct() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    try {
      const result = await wx.cloud.callFunction({
        name: 'activateProduct',
        data: {
          action: 'getActivationByPhoneNumber',
          phoneNumber: userInfo.phoneNumber,
        }
      })

      console.log('云函数返回结果:', result);

      // 检查云函数调用是否成功
      if (result && result.result) {
        const cloudResult = result.result;

        // 检查云函数业务逻辑是否成功
        if (cloudResult.success && cloudResult.data) {
          const res = cloudResult.data;
          // console.log('激活产品数据:', res);

          // 将云函数返回的数据转换为myProducts格式，只包含必要字段
          return res.map((item, index) => ({
            id: index + 1,
            name: item.productCode,
            image: item.finishImages && item.finishImages.length > 0 ? item.finishImages[0] : '',
            status: 'active'
          }));
        } else {
          console.log('云函数业务逻辑失败或无数据:', cloudResult.message);
          return [];
        }
      } else {
        console.error('云函数调用失败');
        return [];
      }
    } catch (error) {
      console.error('获取激活产品时发生错误:', error);
      return [];
    }
  },

  // 跳转登录
  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 跳转全部设备
  onGoProductList() {
    wx.showToast({ title: '全部设备列表开发中', icon: 'none' });
  },

  // 跳转产品详情
  onProductDetail(e) {
    const { id, productCode, image } = e.currentTarget.dataset;

    if (productCode) {
      wx.navigateTo({
        url: `/pages/client/product-detail/product-detail?productCode=${productCode}&image=${encodeURIComponent(image || '')}`
      });
    } else {
      wx.showToast({ title: '产品信息获取失败', icon: 'none' });
    }
  },

  // 产品图片点击 - 预览大图
  onProductImageTap(e) {
    // e.stopPropagation(); // 阻止事件冒泡
    const { image } = e.currentTarget.dataset;

    if (image) {
      wx.previewImage({
        current: image,
        urls: [image]
      });
    } else {
      wx.showToast({ title: '暂无图片', icon: 'none' });
    }
  },

  // 产品名称点击 - 跳转详情
  onProductNameTap(e) {
    // e.stopPropagation(); // 阻止事件冒泡
    const { productCode } = e.currentTarget.dataset;
    console.log('点击跳转', productCode)
    if (productCode) {
      wx.navigateTo({
        url: `/pages/client/product-detail/product-detail?productCode=${productCode}`
      });
    }
  },

  // 产品状态点击 - 显示状态详情
  onProductStatusTap(e) {
    // e.stopPropagation(); // 阻止事件冒泡
    const { productCode, status } = e.currentTarget.dataset;

    const statusText = status === 'active' ? '质保中' : '已过保';
    const message = status === 'active'
      ? '您的设备正处于质保期内，如有问题可享受免费维修服务。'
      : '您的设备已过保，如需维修服务需支付相应费用。';

    wx.showModal({
      title: `设备状态：${statusText}`,
      content: message,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 跳转接单大厅
  onGoWorkerTasks() {
    wx.navigateTo({ url: '/pages/worker/tasks/tasks' });
  },

  // 跳转售后服务工作台
  onGoServiceDesk() {
    wx.navigateTo({ url: '/pages/manager/index/index' });
  },

  // 跳转新闻详情
  onNewsDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `查看新闻 ${id} 详情`, icon: 'none' });
  },

  // 头像加载错误处理
  onAvatarError(e) {
    console.log('头像加载失败，使用默认头像', e);
    this.setData({
      'userInfo.avatarUrl': '/images/default-avatar.png'
    });
  },

  // 加载最近反馈
  async loadRecentFeedbacks() {
    try {
      const feedbacks = await this.getRecentFeedbacksFromCloud();
      this.setData({
        recentFeedbacks: feedbacks
      });
    } catch (error) {
      console.error('加载反馈失败:', error);
    }
  },

  // 从云函数获取最近反馈
  async getRecentFeedbacksFromCloud() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userPhone = userInfo.phone || userInfo.phoneNumber;
      const userId = userInfo._id || userInfo.userId;

      if (!userId) return [];

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getClientIssues',
          phone: userPhone,
          userId: userId,
          limit: 3 // 首页只显示最近3条
        }
      });

      if (result.result && result.result.success) {
        const issues = result.result.data || [];
        return issues.map(issue => ({
          id: issue.issueId || issue._id,
          title: issue.issueId || issue._id,
          description: issue.description,
          status: issue.status,
          statusText: this.getStatusText(issue.status),
          createTime: this.formatTime(issue.createTime),
          hasRated: issue.satisfaction > 0
        }));
      }

      return [];
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      return [];
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      console.log(' 开始获取当前位置...');
      wx.getLocation({
        type: 'gcj02',
        success: async (res) => {
          console.log(' 位置获取成功:', res);
          // const locationInfo = await this.reverseGeocode(res.latitude, res.longitude);
          var locationInfo=''
          try{
            var locationInfo = await wx.cloud.callFunction({
              name:"auth",
              data:{
                action:"reverseGeocode",
                latitude:res.latitude,
                longitude:res.longitude
              }
            })
          }catch(error){
            wx.showToast({
              title: '地理解析失败',
              icon:'error'
            })
          }
          

          this.setData({
            userLocation: locationInfo
          });
        },
        fail: (err) => {
          console.log(' 位置获取失败:', err);
          this.setData({
            userLocation: { city: '定位失败', address: '无法获取位置信息' }
          });
        }
      });
    } catch (error) {
      console.error('获取位置出错', error);
      this.setData({
        userLocation: { city: '定位异常', address: '位置获取异常' }
      });
    }
  },

  getStatusText(status) {
    const statusMap = {
      'pending': '待处理',
      'assigned': '已分配',
      'processing': '处理中',
      'parts_sent': '配件已发出',
      'parts_received': '返件已收到',
      'resolved': '已解决',
      'closed': '已关闭',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知状态';
  },

  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // ==================== 导航事件处理 ====================

  // 跳转产品激活
  onActivateProduct() {
    if (!this.data.hasUserInfo) {
      // 未登录，存储目标页面后跳转登录
      wx.setStorageSync('redirectAfterLogin', '/pages/client/activate/activate');
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/client/activate/activate' });
  },

  // 跳转维修工入驻
  onApplyWorker() {
    if (!this.data.hasUserInfo) {
      // 未登录，存储目标页面后跳转登录
      wx.setStorageSync('redirectAfterLogin', '/pages/client/apply-worker/apply-worker');
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({
      url: '/pages/client/apply-worker/apply-worker'
    });
  },

  // 跳转售后报修
  onGoFeedback() {
    if (!this.data.hasUserInfo) {
      wx.setStorageSync('redirectAfterLogin', '/pages/client/feedback/feedback');
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({
      url: '/pages/client/feedback/feedback'
    });
  },

  //跳转维修工工作台
  onGoWorkerdes() {
    wx.navigateTo({
      url: '/pages/worker/index/index'
    });
  },

  // 跳转服务热线
  onCallService() {
    wx.makePhoneCall({
      phoneNumber: '400-888-8888'
    });
  },

  // 查看反馈详情
  onViewFeedback(e) {
    const feedbackId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/client/feedback/feedback?id=${feedbackId}&mode=view`
    });
  },

  // 查看全部订单
  onViewAll() {
    wx.navigateTo({
      url: '/pages/client/progress/progress'
    });
  },

  // ==================== 轮播图逻辑 ====================

  // 初始化轮播图
  async initBanner() {
    const bannerList = [
      {
        id: 1,
        image: 'cloud://cloud1-5ga6xyav93b12d47.636c-cloud1-5ga6xyav93b12d47-1386774416/avtm/12f-p1.jpg',
        url: ''
      },
      {
        id: 2,
        image: 'cloud://cloud1-5ga6xyav93b12d47.636c-cloud1-5ga6xyav93b12d47-1386774416/avtm/12f-p2.jpg',
        url: ''
      }
    ];

    this.setData({ bannerList });
  },

  onBannerClick(e) {
    console.log('Banner clicked', e.currentTarget.dataset);
    wx.navigateTo({
      url: "/pages/client/remote/remote"
    })
  }
});
