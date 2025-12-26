// pages/worker/worker.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo:'',
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) { 
    this.data.userInfo = wx.getStorageSync('userInfo');
    console.log(this.data.userInfo.userName)
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

    // 可以在这里检查用户身份，如果不是worker则跳转或提示
    if (typeof this.getTabBar === 'function' &&
    this.getTabBar()) {
      // 假设 worker 页面不在 tabbar 中，或者如果是独立入口则不需要这段。
      // 但如果 worker 也是 tabbar 的一部分，需要设置 selected
      // 目前 tabbar 只有 3 项：首页、遥控、我的。worker 可能是独立入口。
    }
  },

  /**
   * 安装设备
   */
  handleInstall() {
    wx.navigateTo({
      url: '/pages/client/activate/activate', // 复用激活页面或新建安装页面
      fail: () => {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 维修设备
   */
  handleRepair() {
    wx.navigateTo({
      url: '/pages/worker/repair/repair',
      fail: () => {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 查阅维修手册
   */
  handleManual() {
    wx.navigateTo({
      url: '/pages/manual/manual',
      fail: () => {
        wx.showToast({
          title: '功能开发中',
          icon: 'none'
        })
      }
    })
  }
})
