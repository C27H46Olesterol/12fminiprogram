// pages/manager/return-parts/return-parts.js
Page({
  data: {
    issueId: '',
    issue: {},
    trackingNumber: '',
    images: [],
    currentTime: ''
  },

  onLoad(options) {
    // 兼容不同的参数名：issueId（主管端）和 id（维修工端、详情页）
    const issueId = options.issueId || options.id || '';
    
    // 设置当前时间
    const currentTime = this.formatTime(new Date());
    this.setData({ 
      issueId,
      currentTime
    });
    
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
    
    this.loadIssueData();
  },

  /**
   * 加载工单数据
   */
  async loadIssueData() {
    wx.showLoading({ title: '加载中...' });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: this.data.issueId,
          phoneNumber: phoneNumber
        }
      });

      if (res.result.success) {
        // getIssueDetail 返回的数据结构是 { issue, history }
        const issue = res.result.data.issue;
        console.log('📋 解析后的工单数据:', issue);
        console.log('🕐 关键时间字段检查:', {
          partsSentTime: issue.partsSentTime,
          partsSentTime_type: typeof issue.partsSentTime,
          partsSentTime_formatted: this.formatTime(issue.partsSentTime),
          status: issue.status,
          partsDetail: issue.partsDetail
        });
        
        this.setData({
          issue: issue || {}
        });
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('❌ 加载工单失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 快递单号输入
   */
  onTrackingNumberInput(e) {
    this.setData({
      trackingNumber: e.detail.value
    });
  },

  /**
   * 选择图片
   */
  onChooseImage() {
    const maxCount = 9 - this.data.images.length;
    
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = [...this.data.images, ...res.tempFilePaths];
        this.setData({
          images: newImages
        });
      }
    });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      urls: this.data.images,
      current: url
    });
  },

  /**
   * 删除图片
   */
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.images];
    images.splice(index, 1);
    
    this.setData({
      images
    });
  },

  /**
   * 格式化时间
   */
  formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 确认发出
   */
  async onConfirm() {
    const { issueId, trackingNumber, images } = this.data;

    // 验证必填项
    if (images.length === 0) {
      wx.showToast({
        title: '请上传配件图片',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });

    try {
      // 上传图片到云存储
      const uploadPromises = images.map(async (imagePath, index) => {
        const cloudPath = `parts/${issueId}/${Date.now()}_${index}.jpg`;
        const result = await wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: imagePath
        });
        return result.fileID;
      });

      const imageUrls = await Promise.all(uploadPromises);

      // 调用云函数发出返件
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'returnParts',
          issueId: issueId,
          trackingNumber: trackingNumber ? trackingNumber.trim() : '',
          partsImages: imageUrls,
          phoneNumber: phoneNumber
        }
      });

      console.log('✅ 发出返件结果:', res.result);

      if (res.result.success) {
        wx.showToast({
          title: '返件已发出',
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
      console.error('❌ 发出返件失败:', error);
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

