// pages/worker/repair/repair.js
const app = getApp();

Page({
  data: {
    formData: {
      productCode: '',
      description: '',
      userPhone: '',
      licensePlate: '',
      beforeImages: [],
      afterImages: []
    },

    // 状态
    canSubmit: false,
    isSubmitting: false,
    location: null // 存储定位信息
  },

  onLoad() {
    this.initPage();
  },

  initPage() {
    // 自动获取定位
    this.getCurrentLocation();
    this.checkCanSubmit();
  },

  // 获取位置信息
  getCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        console.log('定位成功:', res);
        this.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude,
            timestamp: new Date().toISOString()
          }
        });
      },
      fail: (err) => {
        console.error('定位失败:', err);
        wx.showToast({
          title: '请授权位置信息以便记录维修地点',
          icon: 'none'
        });
      }
    });
  },

  // 输入处理
  onProductCodeInput(e) {
    this.setData({ 'formData.productCode': e.detail.value });
    this.checkCanSubmit();
  },

  onDescriptionInput(e) {
    this.setData({ 'formData.description': e.detail.value });
    this.checkCanSubmit();
  },

  onUserPhoneInput(e) {
    this.setData({ 'formData.userPhone': e.detail.value });
    this.checkCanSubmit();
  },

  onLicensePlateInput(e) {
    this.setData({ 'formData.licensePlate': e.detail.value });
    this.checkCanSubmit();
  },

  // 扫码
  onScanQRCode() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res);
        this.setData({ 'formData.productCode': res.result });
        this.checkCanSubmit();
      },
      fail: (err) => {
        if (!err.errMsg.includes('cancel')) {
          wx.showToast({ title: '扫码失败', icon: 'none' });
        }
      }
    });
  },

  // 选择图片通用方法
  chooseImage(type) {
    const currentImages = type === 'before' ? this.data.formData.beforeImages : this.data.formData.afterImages;
    const maxCount = 3 - currentImages.length;

    if (maxCount <= 0) return;

    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newImages = [...currentImages, ...res.tempFilePaths];
        if (type === 'before') {
          this.setData({ 'formData.beforeImages': newImages });
        } else {
          this.setData({ 'formData.afterImages': newImages });
        }
        this.checkCanSubmit();
      }
    });
  },

  // 选择维修前照片
  onChooseBeforeImage() {
    this.chooseImage('before');
  },

  // 选择维修后照片
  onChooseAfterImage() {
    this.chooseImage('after');
  },

  // 预览图片
  previewImage(url, images) {
    wx.previewImage({
      current: url,
      urls: images
    });
  },

  onPreviewBeforeImage(e) {
    this.previewImage(e.currentTarget.dataset.url, this.data.formData.beforeImages);
  },

  onPreviewAfterImage(e) {
    this.previewImage(e.currentTarget.dataset.url, this.data.formData.afterImages);
  },

  // 删除图片
  deleteImage(index, type) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const images = type === 'before' ? [...this.data.formData.beforeImages] : [...this.data.formData.afterImages];
          images.splice(index, 1);

          if (type === 'before') {
            this.setData({ 'formData.beforeImages': images });
          } else {
            this.setData({ 'formData.afterImages': images });
          }
          this.checkCanSubmit();
        }
      }
    });
  },

  onDeleteBeforeImage(e) {
    this.deleteImage(e.currentTarget.dataset.index, 'before');
  },

  onDeleteAfterImage(e) {
    this.deleteImage(e.currentTarget.dataset.index, 'after');
  },

  // 验证表单
  checkCanSubmit() {
    const { formData } = this.data;
    const phoneRegex = /^1[3-9]\d{9}$/;
    
    const isValid =
      formData.productCode.trim() !== '' &&
      formData.description.trim() !== '' &&
      phoneRegex.test(formData.userPhone) &&
      formData.licensePlate.trim() !== '';
      // formData.beforeImages.length > 0 &&
      // formData.afterImages.length > 0;

    this.setData({ canSubmit: isValid });
  },

  // 提交表单
  async onSubmit() {
    if (!this.data.canSubmit) return;

    if (!this.data.location) {
      wx.showToast({
        title: '正在获取定位...',
        icon: 'loading'
      });
      this.getCurrentLocation();
      setTimeout(() => {
        if (!this.data.location) {
          wx.showToast({
            title: '无法获取定位，请检查权限',
            icon: 'none'
          });
        } else {
          this.startSubmit();
        }
      }, 1000);
      return;
    }

    this.startSubmit();
  },

  async startSubmit() {
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 模拟提交
      setTimeout(() => {
        wx.hideLoading();
        wx.showToast({
          title: '提交成功',
          icon: 'success',
          duration: 2000
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }, 1500);

    } catch (error) {
      console.error('提交失败:', error);
      wx.hideLoading();
      wx.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
})
