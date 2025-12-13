// pages/index/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceData: null,
    lastUpdateTime: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.deviceId = options.deviceId || 'default-device';
    this.initDataConnection();
  },

  
  initDataConnection() {
    // 根据需求选择连接方式
    this.connectWebSocket();
    // 或者
    this.startPolling();
    // 或者
    this.watchCloudDatabase();
  },
  
  connectWebSocket() {
    await wx.cloud.callFunction({
      name:'onenet',
      data:{
        body:deviceData
      }
    })
  },
  
  startPolling() {
    this.pollDeviceData();
    this.timer = setInterval(() => {
      this.pollDeviceData();
    }, 5000);
  },
  
  async pollDeviceData() {
    try {
      const res = await wx.request({
        url: 'https://your-server.com/api/device/latest',
        data: { deviceId: this.deviceId }
      });
      
      if (res.data.code === 0) {
        this.setData({
          deviceData: res.data.data,
          lastUpdateTime: new Date().toLocaleString()
        });
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    }
  },
  
  refreshData() {
    this.pollDeviceData();
    wx.showToast({
      title: '刷新成功',
      icon: 'success'
    });
  },


  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    if (this.timer) clearInterval(this.timer);
    if (this.watcher) this.watcher.close();
    if (this.socket) wx.closeSocket();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})