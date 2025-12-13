// pages/client/feedback-success/feedback-success.js
const app = getApp();

Page({
  data: {
    feedbackId: '',
    feedbackTime: '',
    customerServicePhone: '400-123-4567'
  },

  onLoad(options) {
    const { feedbackId, feedbackTime } = options;
    this.setData({
      feedbackId: feedbackId || 'YF202401010001',
      feedbackTime: feedbackTime || new Date().toLocaleString()
    });
  },

  // 复制反馈单号
  copyFeedbackId() {
    wx.setClipboardData({
      data: this.data.feedbackId,
      success: () => {
        app.showSuccess('反馈单号已复制');
      }
    });
  },

  // 拨打客服电话
  callCustomerService() {
    wx.makePhoneCall({
      phoneNumber: this.data.customerServicePhone,
      fail: () => {
        app.showError('拨号失败');
      }
    });
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/client/index/index'
    });
  },

  // 查看进度
  checkProgress() {
    wx.navigateTo({
      url: `/pages/client/progress/progress?feedbackId=${this.data.feedbackId}`
    });
  }
});

