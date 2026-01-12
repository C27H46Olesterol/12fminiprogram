// pages/login/dealer/dealer.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    dealers: [
      {
        id: 1,
        nickname: "张三经销商",
        phone: "13800138001",
        brands: "格力, 美的",
        region: "广东省广州市天河区",
        status: 1, // 1: 已通过, 0: 审核中, -1: 已拒绝
        statusText: "已通过"
      },
      {
        id: 2,
        nickname: "李四贸易公司",
        phone: "13912345678",
        brands: "海尔",
        region: "浙江省杭州市西湖区",
        status: 0,
        statusText: "审核中"
      },
      {
        id: 3,
        nickname: "王五电器城",
        phone: "13788889999",
        brands: "奥克斯, 志高",
        region: "北京市朝阳区",
        status: -1,
        statusText: "已拒绝"
      }
    ]
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 可以在这里调用接口获取经销商列表
  },

  /**
   * 添加经销商点击事件
   */
  onAddDealer() {
    wx.showModal({
      title: '添加经销商',
      placeholderText: '请输入经销商手机号',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const phone = res.content.trim();
          if (!/^1[3-9]\d{9}$/.test(phone)) {
            wx.showToast({
              title: '手机号格式不正确',
              icon: 'none'
            });
            return;
          }

          // 模拟添加数据
          const newDealer = {
            id: Date.now(),
            nickname: `经销商(${phone.substring(7)})`, // 模拟生成一个昵称
            phone: phone,
            brands: "待完善", // 默认品牌
            region: "待分配地区",
            status: 0,
            statusText: "审核中"
          };

          const dealers = this.data.dealers;
          dealers.push(newDealer);

          this.setData({
            dealers: dealers
          });

          wx.showToast({
            title: '已提交审核',
            icon: 'success'
          });
        } else if (res.confirm && !res.content) {
          wx.showToast({
            title: '请输入手机号',
            icon: 'none'
          });
        }
      }
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