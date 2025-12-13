// pages/client/rate-issue/rate-issue.js
const app = getApp();

Page({
  data: {
    userInfo: null,
    issue: null,
    rating: 5,
    feedback: '',
    isLoading: false,
    isSubmitting: false
  },

  onLoad(options) {
    console.log('🚀 rate-issue onLoad - 接收到的参数:', options);
    const { id } = options;
    console.log('📋 提取的 id:', id);
    
    if (id) {
      this.setData({ issueId: id });
      console.log('✅ 设置 issueId:', id);
      this.initPage();
      this.loadIssueDetail();
    } else {
      console.error('❌ 缺少问题ID');
      wx.showToast({
        title: '缺少问题ID',
        icon: 'error'
      });
      wx.navigateBack();
    }
  },

  // 初始化页面
  initPage() {
    const userInfo = app.globalData.userInfo;
    if (!userInfo) {
      app.logout();
      return;
    }
    
    this.setData({ userInfo });
  },

  // 加载问题详情
  async loadIssueDetail() {
    try {
      this.setData({ isLoading: true });
      
      console.log('📋 开始加载问题详情...');
      console.log('📋 当前 issueId:', this.data.issueId);
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      console.log('📞 用户手机号:', phoneNumber);
      
      // 调用云函数获取问题详情
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: this.data.issueId,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 云函数调用结果:', result);
      console.log('📋 result.result:', result.result);
      console.log('📋 result.result.success:', result.result?.success);
      console.log('📋 result.result.message:', result.result?.message);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取问题详情:', data);
        
        // 格式化时间
        const issue = {
          ...data.issue,
          resolvedTimeText: this.formatTime(data.issue.resolvedTime)
        };
        
        this.setData({
          issue: issue
        });
        
        // 如果已经评价过，显示之前的评价
        if (data.issue.satisfaction) {
          this.setData({
            rating: data.issue.satisfaction,
            feedback: data.issue.feedback || ''
          });
        }
        
        console.log('📋 问题详情加载完成');
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载问题详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 选择评分
  onRatingChange(e) {
    const rating = parseInt(e.currentTarget.dataset.rating);
    this.setData({ rating });
  },

  // 输入反馈
  onFeedbackInput(e) {
    this.setData({ feedback: e.detail.value });
  },

  // 提交评价
  async onSubmitRating() {
    if (this.data.isSubmitting) return;

    try {
      this.setData({ isSubmitting: true });
      app.showLoading('提交中...');
      
      console.log('📝 开始提交评价...');
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数提交评价
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'submitRating',
          issueId: this.data.issueId,
          satisfaction: this.data.rating,
          feedback: this.data.feedback,
          phoneNumber: phoneNumber
        }
      });

      console.log('📝 云函数调用结果:', result);

      if (result.result && result.result.success) {
        wx.showToast({
          title: '评价提交成功',
          icon: 'success'
        });
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        
      } else {
        throw new Error(result.result?.message || '提交评价失败');
      }
      
    } catch (error) {
      console.error('❌ 提交评价失败:', error);
      wx.showToast({
        title: '提交失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isSubmitting: false });
      app.hideLoading();
    }
  },

  // 获取评分文本
  getRatingText(rating) {
    const map = {
      1: '很不满意',
      2: '不满意',
      3: '一般',
      4: '满意',
      5: '很满意'
    };
    return map[rating] || '未评价';
  },

  // 获取评分颜色
  getRatingColor(rating) {
    const map = {
      1: '#f5222d',
      2: '#fa8c16',
      3: '#faad14',
      4: '#52c41a',
      5: '#1890ff'
    };
    return map[rating] || '#999';
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 返回上一页
  onGoBack() {
    wx.navigateBack();
  }
});
