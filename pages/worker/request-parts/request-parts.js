// pages/worker/request-parts/request-parts.js
Page({
  data: {
    taskId: '',
    task: null,
    partsDetail: '',
    problemDescription: '',
    requestReason: ''
  },

  onLoad(options) {
    const { taskId } = options;
    
    if (!taskId) {
      wx.showToast({
        title: '缺少任务ID',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ taskId });
    this.loadTaskDetail(taskId);
  },

  /**
   * 加载任务详情
   */
  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: taskId,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 任务详情:', res.result);

      if (res.result.success) {
        // getIssueDetail 返回的数据结构是 { issue, history }
        const task = res.result.data.issue;
        console.log('📋 解析后的任务数据:', task);
        
        this.setData({
          task: task,
          partsDetail: task.partsDetail || ''
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
      console.error('❌ 加载任务详情失败:', error);
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

  onPartsDetailInput(e) {
    this.setData({
      partsDetail: e.detail.value
    });
  },

  onProblemInput(e) {
    this.setData({
      problemDescription: e.detail.value
    });
  },

  onRequestReasonInput(e) {
    this.setData({
      requestReason: e.detail.value
    });
  },

  onCancel() {
    wx.navigateBack();
  },

  async onConfirm() {
    const { taskId, partsDetail, problemDescription, requestReason } = this.data;

    if (!partsDetail || !partsDetail.trim()) {
      wx.showToast({
        title: '请填写配件详情',
        icon: 'none'
      });
      return;
    }

    if (!problemDescription || !problemDescription.trim()) {
      wx.showToast({
        title: '请填写问题描述',
        icon: 'none'
      });
      return;
    }

    if (!requestReason || !requestReason.trim()) {
      wx.showToast({
        title: '请填写申请理由',
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
          action: 'requestParts',
          issueId: taskId,
          partsDetail: partsDetail.trim(),
          problemDescription: problemDescription.trim(),
          requestReason: requestReason.trim(),
          phoneNumber: phoneNumber
        }
      });

      console.log('✅ 申请发出配件结果:', res.result);

      if (res.result.success) {
        wx.showToast({
          title: '申请已提交',
          icon: 'success'
        });

        setTimeout(() => {
          const pages = getCurrentPages();
          if (pages.length >= 2) {
            const prevPage = pages[pages.length - 2];
            if (prevPage.loadTaskDetail) {
              prevPage.loadTaskDetail();
            }
          }
          wx.navigateBack();
        }, 1500);
      } else {
        wx.showToast({
          title: res.result.message || '申请失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('❌ 申请发出配件失败:', error);
      wx.showToast({
        title: '申请失败: ' + error.message,
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  }
});

