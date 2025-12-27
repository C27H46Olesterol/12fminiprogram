// pages/client/activate/activate.js
const app = getApp();

Page({
  data: {
    formData: {
      productCode: '',
      licensePlate: '',
      userPhone: '',
      installerPhone: '',
      processImages: [],
      finishImages: []
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

    // 自动填充手机号逻辑
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    const userPhone = userInfo && (userInfo.phone || userInfo.phoneNumber);
    const userRole = userInfo && userInfo.role; // 假设role字段存在

    if (userPhone) {
      if (userRole === 'worker') {
        // 如果是维修工提交，自动填充安装师傅手机号
        this.setData({
          'formData.installerPhone': userPhone
        });
      } else {
        // 默认为普通用户/产品用户提交，填充用户手机号
        this.setData({
          'formData.userPhone': userPhone
        });
      }
    }

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
            timestamp: new Date().toISOString() // 记录定位时间
          }
        });
      },
      fail: (err) => {
        console.error('定位失败:', err);
        wx.showToast({
          title: '请授权位置信息以便记录安装地点',
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

  onLicensePlateInput(e) {
    this.setData({ 'formData.licensePlate': e.detail.value });
    this.checkCanSubmit();
  },

  onUserPhoneInput(e) {
    this.setData({ 'formData.userPhone': e.detail.value });
    this.checkCanSubmit();
  },

  onInstallerPhoneInput(e) {
    this.setData({ 'formData.installerPhone': e.detail.value });
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
    const currentImages = type === 'process' ? this.data.formData.processImages : this.data.formData.finishImages;
    const maxCount = 3 - currentImages.length;

    if (maxCount <= 0) return;

    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newImages = [...currentImages, ...res.tempFilePaths];
        if (type === 'process') {
          this.setData({ 'formData.processImages': newImages });
        } else {
          this.setData({ 'formData.finishImages': newImages });
        }
        this.checkCanSubmit();
      }
    });
  },

  // 选择安装过程照片
  onChooseProcessImage() {
    this.chooseImage('process');
  },

  // 选择安装完成照片
  onChooseFinishImage() {
    this.chooseImage('finish');
  },

  // 预览图片
  previewImage(url, images) {
    wx.previewImage({
      current: url,
      urls: images
    });
  },

  onPreviewProcessImage(e) {
    this.previewImage(e.currentTarget.dataset.url, this.data.formData.processImages);
  },

  onPreviewFinishImage(e) {
    this.previewImage(e.currentTarget.dataset.url, this.data.formData.finishImages);
  },

  // 删除图片
  deleteImage(index, type) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          const images = type === 'process' ? [...this.data.formData.processImages] : [...this.data.formData.finishImages];
          images.splice(index, 1);

          if (type === 'process') {
            this.setData({ 'formData.processImages': images });
          } else {
            this.setData({ 'formData.finishImages': images });
          }
          this.checkCanSubmit();
        }
      }
    });
  },

  onDeleteProcessImage(e) {
    this.deleteImage(e.currentTarget.dataset.index, 'process');
  },

  onDeleteFinishImage(e) {
    this.deleteImage(e.currentTarget.dataset.index, 'finish');
  },

  // 验证表单
  checkCanSubmit() {
    const { formData } = this.data;
    const phoneRegex = /^1[3-9]\d{9}$/;

    const isValid =
      formData.productCode.trim() !== '' &&
      formData.licensePlate.trim() !== '' &&
      phoneRegex.test(formData.userPhone) &&
      phoneRegex.test(formData.installerPhone)
    // formData.processImages.length < 0 &&
    // formData.finishImages.length < 0;

    this.setData({ canSubmit: isValid });
  },

  // 上传多张图片到云存储
  async uploadImages(imagePaths, folder) {
    const uploadPromises = imagePaths.map(async (filePath) => {
      const cloudPath = `activations/${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const result = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      });
      return result.fileID;
    });
    return Promise.all(uploadPromises);
  },

  // 提交表单
  async onSubmit() {
    if (!this.data.canSubmit) return;

    // 再次检查定位，如果之前失败了
    if (!this.data.location) {
      wx.showToast({
        title: '正在获取定位...',
        icon: 'loading'
      });
      this.getCurrentLocation();
      // 给定位一点时间，或者直接允许提交但标记无定位
      // 这里选择必须有定位才能提交
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
      // 1. 上传图片
      const processImageIds = await this.uploadImages(this.data.formData.processImages, 'process');
      const finishImageIds = await this.uploadImages(this.data.formData.finishImages, 'finish');

      // 2. 准备提交数据
      const userInfo = wx.getStorageSync('userInfo') || {};
      const submitTime = new Date().toISOString(); // 提交时间

      // 3. 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'activateProduct',
        data: {
          action: 'submitProductActivation',
          userId: userInfo._id || userInfo.userId,
          openId: userInfo.openid,
          submitterPhone: userInfo.phone || userInfo.phoneNumber,
          submitterRole: userInfo.role || 'user',

          productCode: this.data.formData.productCode,
          licensePlate: this.data.formData.licensePlate,
          userPhone: this.data.formData.userPhone,
          installerPhone: this.data.formData.installerPhone,

          processImages: processImageIds,
          finishImages: finishImageIds,

          location: this.data.location, // 包含 latitude, longitude, timestamp
          submitTime: submitTime // 记录提交时间
        }

      });
      console.log('云函数返回:', result);

      // wx.cloud.callFunction 返回的对象结构为 { result: { ... }, requestID: ... }
      // 实际的业务返回值在 result.result 中
      const res = result.result;

      if (res && res.success) {
        wx.hideLoading();
        wx.showToast({
          title: '提交成功',
          icon: 'success',
          duration: 2000
        });
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        throw new Error(res?.message || '提交失败');
      }

    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
})
