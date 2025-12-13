// pages/processing-info/processing-info.js
Page({
  data: {
    issueId: '',
    role: '', // 'manager' 或 'worker'
    issue: {},
    needParts: 'no', // 是否需要配件
    partsDetail: '' // 配件详情
  },

  onLoad(options) {
    const issueId = options.id;
    const role = options.role || 'worker';
    
    this.setData({
      issueId,
      role
    });
    
    this.loadIssueDetail();
  },

  // 加载工单详情
  async loadIssueDetail() {
    try {
      wx.showLoading({ title: '加载中...' });
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: this.data.issueId,
          phoneNumber: phoneNumber
        }
      });
      
      wx.hideLoading();
      
      if (result.result && result.result.success) {
        this.setData({
          issue: result.result.data
        });
      } else {
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 加载工单详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  // 是否需要配件变化
  onNeedPartsChange(e) {
    this.setData({
      needParts: e.detail.value
    });
  },

  // 配件详情输入
  onPartsDetailInput(e) {
    this.setData({
      partsDetail: e.detail.value
    });
  },

  // 开始处理
  async startProcessing() {
    // 验证必填项
    if (this.data.needParts === 'yes' && !this.data.partsDetail.trim()) {
      wx.showToast({
        title: '请填写配件详情',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({ title: '提交中...' });
      
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'startProcessing',
          issueId: this.data.issueId,
          needParts: this.data.needParts === 'yes',
          partsDetail: this.data.partsDetail,
          phoneNumber: phoneNumber
        }
      });
      
      wx.hideLoading();
      
      if (result.result && result.result.success) {
        wx.showToast({
          title: '开始处理',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: result.result?.message || '提交失败',
          icon: 'error'
        });
      }
    } catch (error) {
      wx.hideLoading();
      console.error('❌ 开始处理失败:', error);
      wx.showToast({
        title: '提交失败',
        icon: 'error'
      });
    }
  }
});

