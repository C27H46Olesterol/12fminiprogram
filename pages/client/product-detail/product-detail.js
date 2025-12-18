// pages/client/product-detail/product-detail.js
const app = getApp();

Page({
  data: {
    productId: '', // 产品ID
    productInfo: {
      name: '',
      productCode: '',
      image: '',
      status: 'active',
      activateTime: '',
      warrantyEnd: '',
      location: '',
      serialNumber: ''
    },
    
  },

  onLoad(options) {
    console.log('产品详情页面加载', options);
    const { id, productCode } = options;

    if (id) {
      this.setData({ productId: id });
      this.loadProductDetail(id);
    } else if (productCode) {
      this.setData({ productId: productCode });
      this.loadProductDetailByCode(productCode);
    } else {
      // 如果没有参数，可能是调试模式，不强制返回
      console.warn('未检测到产品ID或编码');
    }

    // 加载设备状态
    // this.loadDeviceStatus();
  },

  // 加载产品详情
  async loadProductDetail(productId) {
    try {
      wx.showLoading({ title: '加载中...' });

      const userInfo = wx.getStorageSync('userInfo') || {};
      const result = await wx.cloud.callFunction({
        name: 'activateProduct',
        data: {
          action: 'getActivationById',
          activationId: productId,
          phoneNumber: userInfo.phoneNumber
        }
      });

      if (result.result && result.result.success) {
        const data = result.result.data;
        this.setData({
          productInfo: {
            name: data.productName || '驻车空调',
            productCode: data.productCode,
            image: data.finishImages && data.finishImages.length > 0 ? data.finishImages[0] : '',
            status: 'active',
            activateTime: this.formatTime(data.createTime),
            warrantyEnd: this.calculateWarrantyEnd(data.createTime),
            location: data.location || '未设置',
            serialNumber: data.serialNumber || '未设置'
          }
        });
      } else {
        wx.showToast({
          title: '获取产品信息失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载产品详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 通过产品编码加载产品详情
  async loadProductDetailByCode(productCode) {
    try {
      wx.showLoading({ title: '加载中...' });

      const userInfo = wx.getStorageSync('userInfo') || {};
      const result = await wx.cloud.callFunction({
        name: 'activateProduct',
        data: {
          action: 'getActivationByPhoneNumber',
          phoneNumber: userInfo.phone
        }
      });
      console.log(result.result)
      if (result.result && result.result.success) {
        const activations = result.result.data || [];
        const targetActivation = activations.find(item => item.productCode === productCode);

        if (targetActivation) {
          this.setData({
            productId: targetActivation._id,
            productInfo: {
              name: targetActivation.product_name || '驻车空调',
              productCode: targetActivation.productCode,
              image: targetActivation.finishImages && targetActivation.finishImages.length > 0 ? targetActivation.finishImages[0] : '',
              status: 'active',
              activateTime: this.formatTime(targetActivation.createTime),
              warrantyEnd: this.calculateWarrantyEnd(targetActivation.createTime),
              location: targetActivation.location || '未设置',
              serialNumber: targetActivation.serialNumber || '未设置'
            }
          });
        } else {
          wx.showToast({
            title: '未找到产品信息',
            icon: 'none'
          });
        }
      } else {
        wx.showToast({
          title: '获取产品信息失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('加载产品详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  
  // 报修反馈
  onFeedback() {
    wx.navigateTo({
      url: '/pages/client/feedback/feedback'
    });
  },

  // 联系客服
  onCallService() {
    wx.makePhoneCall({
      phoneNumber: '400-888-8888'
    });
  },

  // 工具函数：格式化时间
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // 工具函数：计算保修到期时间（假设保修期为2年）
  calculateWarrantyEnd(activateTime) {
    if (!activateTime) return '';
    const activateDate = new Date(activateTime);
    const warrantyEnd = new Date(activateDate.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
    return this.formatTime(warrantyEnd);
  }
});
