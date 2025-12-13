// pages/manager/send-parts/send-parts.js
Page({
  data: {
    issueId: '',
    issue: null,
    partsDetail: '',
    problemDescription: ''
  },

  onLoad(options) {
    const { issueId } = options;
    
    if (!issueId) {
      wx.showToast({
        title: '缺少工单ID',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ issueId });
    this.loadIssueDetail(issueId);
  },

  /**
   * 加载工单详情
   */
  async loadIssueDetail(issueId) {
    wx.showLoading({ title: '加载中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: issueId,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 工单详情:', res.result);

      if (res.result.success) {
        const issue = res.result.data.issue;
        
        // 格式化发出时间
        if (issue.partsSentTime) {
          const date = new Date(issue.partsSentTime);
          issue.partsSendTime = this.formatDateTime(date);
        }
        
        this.setData({
          issue: issue,
          // 如果之前填写过配件详情，显示出来
          partsDetail: issue.partsDetail || ''
        });
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('❌ 加载工单详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 格式化日期时间
   */
  formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  /**
   * 配件详情输入
   */
  onPartsDetailInput(e) {
    this.setData({
      partsDetail: e.detail.value
    });
  },

  /**
   * 问题描述输入
   */
  onProblemInput(e) {
    this.setData({
      problemDescription: e.detail.value
    });
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 确认发出配件
   */
  async onConfirm() {
    const { issueId, partsDetail, problemDescription } = this.data;

    // 验证必填项
    if (!problemDescription || !problemDescription.trim()) {
      wx.showToast({
        title: '请填写配件类型',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'sendParts',
          issueId: issueId,
          partsDetail: partsDetail.trim(),
          problemDescription: problemDescription.trim(),
          phoneNumber: phoneNumber
        }
      });

      console.log('✅ 发出配件结果:', res.result);

      if (res.result.success) {
        wx.showToast({
          title: '配件已发出',
          icon: 'success'
        });

        // 延迟返回
        setTimeout(() => {
          // 返回上一页并刷新
          const pages = getCurrentPages();
          if (pages.length >= 2) {
            const prevPage = pages[pages.length - 2];
            if (prevPage.loadData) {
              prevPage.loadData();
            }
          }
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '发出失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('❌ 发出配件失败:', error);
      wx.showToast({
        title: '发出失败: ' + error.message,
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  }
});

