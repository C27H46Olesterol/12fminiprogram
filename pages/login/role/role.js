// pages/login/role/role.js
Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 选择普通用户
   */
  selectUser() {
    // 可以在这里存储角色信息，例如
    // wx.setStorageSync('role', 'user');

    // 跳转到首页 (TabBar 页面使用 switchTab)
    wx.switchTab({
      url: '/pages/index'
    });
  },

  /**
   * 选择安装/维修工
   */
  selectWorker() {
    // 存储角色信息
    // wx.setStorageSync('role', 'worker');

    // 跳转到工作台 (非 TabBar 页面使用 navigateTo 或 redirectTo)
    // 根据需求，这可能是一个主要入口，可以用 reLaunch 或 redirectTo 防止回退
    wx.reLaunch({
      url: '/pages/worker/worker'
    });
  }
})
