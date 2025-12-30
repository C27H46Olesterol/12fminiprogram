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
    const userInfo = app.globalData.userInfo;
    const hasUserInfo = app.globalData.userInfo;

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

  goDevices() {
    wx.navigateTo({
      url: '/pages/client/devices/devices',
    })
  },

  goActivateLog() {
    wx.navigateTo({
      url: '/pages/worker/activateLog/activateLog',
    })
  },

  goIssuesLog() {
    wx.navigateTo({
      url: '/pages/client/issuesLog/issuesLog',
    })
  },

  goRepairLog() {
    wx.navigateTo({
      url: '/pages/worker/repairLog/repairLog',
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
      const userInfo = app.globalData.userInfo;
      // userInfo.userRole.push('维修工')
      console.log('接口调用成功:', userInfo)
    }
  },

  async getUserRole() {
    // const result =await app.apiRequest('/system/user/getInfo','GET');
    // const roles = result.data.user.roles
    // const userRole = roles.map(i=>i.roleName)
    console.log('userInfo', this.data.userInfo)
  },

  async apiTest() {
    this.getUserRole();
    // this.goApply();
  },

  roleChange() {
    const userInfo = app.globalData.userInfo
    if (userInfo.userRole === '维修工') {
      userInfo.userRole = '普通用户'
    }
    else {
      userInfo.userRole = '维修工'
    }
    app.globalData.userInfo = userInfo
    wx.showLoading({ title: "加载中", mask: true })
    this.onShow();
    setTimeout(() => {
      wx.hideLoading();
    }, 1000);
  }
})
