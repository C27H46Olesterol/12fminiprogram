// pages/profile/resign/resign.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    formData: {
      storeName: '',
      storeAddress: '',
      storeImages: [],
      licenseImages: []
    },
    canSubmit: false,
    isSubmitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  // 输入处理
  onStoreNameInput(e) {
    this.setData({
      'formData.storeName': e.detail.value
    });
    this.checkCanSubmit();
  },

  onStoreAddressInput(e) {
    this.setData({
      'formData.storeAddress': e.detail.value
    });
    this.checkCanSubmit();
  },

  // 通用图片选择逻辑
  chooseImage(type, maxCount) {
    wx.chooseImage({
      count: maxCount,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const key = `formData.${type}`;
        const currentImages = this.data.formData[type];
        const newImages = [...currentImages, ...res.tempFilePaths];

        // 限制最大数量
        if (newImages.length > maxCount) {
          // 如果这批加起来超过了，可以截断或者提示，这里由chooseImage count限制了一次，但多次选择需要注意
          // 由于 chooseImage 是单次限制，这里直接追加，但调用前已判断剩余名额
        }

        this.setData({
          [key]: newImages
        });
        this.checkCanSubmit();
      }
    });
  },

  // 店面照片
  onChooseStoreImage() {
    const max = 3 - this.data.formData.storeImages.length;
    if (max > 0) {
      this.chooseImage('storeImages', max);
    }
  },

  onDeleteStoreImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.formData.storeImages];
    images.splice(index, 1);
    this.setData({
      'formData.storeImages': images
    });
    this.checkCanSubmit();
  },

  onPreviewStoreImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.formData.storeImages
    });
  },

  // 营业执照
  onChooseLicenseImage() {
    const max = 1 - this.data.formData.licenseImages.length;
    if (max > 0) {
      this.chooseImage('licenseImages', max);
    }
  },

  onDeleteLicenseImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.formData.licenseImages];
    images.splice(index, 1);
    this.setData({
      'formData.licenseImages': images
    });
    this.checkCanSubmit();
  },

  onPreviewLicenseImage(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({
      current: url,
      urls: this.data.formData.licenseImages
    });
  },

  // 检查是否可提交
  checkCanSubmit() {
    const { storeName, storeAddress, storeImages, licenseImages } = this.data.formData;
    const isValid = storeName.trim() &&
      storeAddress.trim() &&
      storeImages.length > 0 &&
      licenseImages.length > 0;

    this.setData({
      canSubmit: !!isValid
    });
  },

  // 提交审核
  async onSubmit() {
    if (!this.data.canSubmit || this.data.isSubmitting) return;

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '正在提交...' });

    try {
      // 1. 模拟上传图片
      // const storeImgUrls = await this.uploadImages(this.data.formData.storeImages);
      // const licenseImgUrls = await this.uploadImages(this.data.formData.licenseImages);

      // 2. 模拟提交数据
      // const result = await app.apiRequest('/worker/apply', 'POST', { ... });

      setTimeout(() => {
        wx.hideLoading();
        wx.showToast({
          title: '提交成功，请等待审核',
          icon: 'success',
          duration: 2000
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }, 1500);

    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: '提交失败，请重试',
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
    }
  }
})

