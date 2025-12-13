// pages/manager/complete-task/complete-task.js
Page({
  data: {
    issueId: '',
    issue: null,
    faultType: '',  // 故障类型
    showFaultModal: false,  // 是否显示故障类型弹窗
    faultTypes: [  // 故障类型列表
      '压缩机类',
      '电板类',
      '控制器类',
      '膨胀阀类',
      '冷凝器类',
      '线束类',
      '冷媒充注类',
      '其它'
    ]
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
        this.setData({
          issue: res.result.data.issue
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
   * 显示故障类型弹窗
   */
  showFaultTypeModal() {
    this.setData({
      showFaultModal: true
    });
  },

  /**
   * 隐藏故障类型弹窗
   */
  hideFaultTypeModal() {
    this.setData({
      showFaultModal: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 阻止点击弹窗内容时关闭弹窗
  },

  /**
   * 选择故障类型
   */
  selectFaultType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      faultType: type,
      showFaultModal: false
    });
  },

  /**
   * 显示故障代码输入
   */
  showCodeInput() {
    this.setData({
      showFaultModal: false
    });
    wx.showModal({
      title: '显示故障代码',
      content: '请输入故障代码',
      editable: true,
      placeholderText: '请输入故障代码',
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({
            faultType: `故障代码: ${res.content}`
          });
        }
      }
    });
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 确认完成
   */
  async onConfirm() {
    const { issueId, faultType } = this.data;

    // 验证必填项
    if (!faultType) {
      wx.showToast({
        title: '请选择项目类型',
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
          action: 'completeTask',
          issueId: issueId,
          projectType: faultType,
          phoneNumber: phoneNumber
        }
      });

      console.log('✅ 完成任务结果:', res.result);

      if (res.result.success) {
        wx.showToast({
          title: '任务已完成',
          icon: 'success'
        });

        // 延迟返回，让用户看到成功提示
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
          title: res.result.message || '完成失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('❌ 完成任务失败:', error);
      wx.showToast({
        title: '完成失败: ' + error.message,
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  }
});

