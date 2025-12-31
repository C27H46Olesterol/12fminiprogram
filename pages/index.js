// pages/index.js
const app = getApp();
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null
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
    this.initPage();
    // 更新自定义 TabBar 状态
    
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
    const userInfo = wx.getStorageSync('userInfo');
    const hasUserInfo = wx.getStorageSync('hasUserInfo');

    
    if (!userInfo && !hasUserInfo) {
      // 未登录直接重定向到客户端首页
      console.log()
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    
    this.setData({
      hasUserInfo: app.globalData.hasUserInfo,
      userInfo: app.globalData.userInfo
    });

    console.log("用户身份",this.data.userInfo.userRole)

    
    // const isWorker = Array.isArray(role) ? role.includes('维修工') : role === '维修工';
    // const userRoleStr = isWorker ? '维修工' : '普通用户';

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
