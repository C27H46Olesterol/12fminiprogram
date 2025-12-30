// pages/index.js
const app = getApp();
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userRole: '', // '维修工' 或其他
    userInfo: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initPage();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.initPage();
    // 更新自定义 TabBar 状态
    console.log(this.data.userInfo)
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 初始化页面逻辑
   */
  initPage() {
    const userInfo = app.globalData.userInfo
    const hasUserInfo = app.globalData.hasUserInfo

    // const userInfo = wx.getStorageSync('userInfo');
    // const hasUserInfo = wx.getStorageSync('hasUserInfo');
    if (!hasUserInfo || !userInfo) {
      // 未登录直接重定向到客户端首页
      wx.reLaunch({ url: '/pages/client/index/index' });
      return;
    }

    const role = userInfo.userRole;
    const isWorker = Array.isArray(role) ? role.includes('维修工') : role === '维修工';
    const userRoleStr = isWorker ? '维修工' : '普通用户';

    this.setData({
      userInfo,
      userRole: userRoleStr
    });
  },

  // ===================== 维修工逻辑 =====================
  handleInstall() {
    wx.navigateTo({ url: '/pages/worker/activate/activate' });
  },

  handleRepair() {
    wx.navigateTo({ url: '/pages/worker/repair/repair' });
  },

  // ===================== 普通用户逻辑 =====================
  handleReport() {
    wx.navigateTo({ url: '/pages/client/issues/issues' });
  },

  handleReportLog(){
    wx.navigateTo({ url:'/pages/client/issuesLog/issuesLog'})
  },

  // ===================== 共享逻辑 =====================
  handleManual() {
    wx.navigateTo({ url: '/pages/manual/manual' });
  }
})
