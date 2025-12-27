const app = getApp();

Page({
  data: {
    hasUserInfo: false,
    userInfo: {}
  },
  onShow() {
    this.checkLoginStatus();
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
  },

  async checkLoginStatus() {
    const userInfo = wx.getStorageSync('userInfo');
    const hasUserInfo = wx.getStorageSync('hasUserInfo');

    if (hasUserInfo && userInfo) {
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      });
    }
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的登录信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('isLogin');
          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    })
  },

  goManual() {
    wx.navigateTo({
      url: '/pages/manual/manual',
    })
  },

  goWorker() {
    wx.navigateTo({
      url: '/pages/worker/worker',
    })
  },

  goRepair() {
    wx.navigateTo({
      url: '/pages/worker/repair/repair'
    })
  },

  goResign() {
    wx.navigateTo({
      url: '/pages/profile/resign/resign',
    })
  },

  async goApply() {
    const res = await app.apiRequest('/system/user/applyRepairmanRole', 'POST');
    if (res.data.code === 200) {
      const userInfo = wx.getStorageSync('userInfo');
      // userInfo.userRole.push('维修工')
      console.log('接口调用成功:', userInfo)
    }
  },

  async getUserRole() {
    // const result =await app.apiRequest('/system/user/getInfo','GET');
    // const roles = result.data.user.roles
    // const userRole = roles.map(i=>i.roleName)
    console.log('userInfo', this.data.userInfo)
    console.log(roles[0])
  },

  async apiTest() {
    this.getUserRole();
    // this.goApply();
  },

  roleChange() {
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo.userRole === '维修工') {
      userInfo.userRole = '普通用户'
    }
    else {
      userInfo.userRole = '维修工'
    }
    wx.setStorageSync('userInfo', userInfo)
    wx.showLoading({ title: "加载中", mask: true })
    this.onShow();
    setTimeout(() => {
      wx.hideLoading();
    }, 1000);
  }
})
