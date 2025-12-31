const app = getApp();
const formAPI = require("../../../utils/formAPI");
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    formData: {
      sn: '',
      phone: '',
      description: ''
    },
    tempImages: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({
      userInfo,
      'formData.phone': userInfo ? userInfo.phone : ''
    });
  },

  /**
   * 输入绑定
   */
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  /**
   * 扫码设备码
   */
  onScanSN() {
    wx.scanCode({
      success: (res) => {
        this.setData({
          'formData.sn': res.result
        });
      }
    });
  },

  /**
   * 选择故障图片
   */
  onChooseImage() {
    const count = 4 - this.data.tempImages.length;
    wx.chooseImage({
      count: count,
      sizeType: ['compressed'],
      success: (res) => {
        this.setData({
          tempImages: this.data.tempImages.concat(res.tempFilePaths)
        });
      }
    });
  },

  /**
   * 移除图片
   */
  onRemoveImage(e) {
    const { index } = e.currentTarget.dataset;
    let tempImages = this.data.tempImages;
    tempImages.splice(index, 1);
    this.setData({ tempImages });
  },

  /**
   * 预览图片
   */
  onPreviewImage(e) {
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: this.data.tempImages
    });
  },

  /**
   * 提交报修申请
   */
  async uploadImages(imagePaths) {
    if (!imagePaths || imagePaths.length === 0) return [];
    try {
      const uploadPromises = imagePaths.map(path => formAPI.uploadImg(path));
      const results = await Promise.all(uploadPromises);
      return results;
    } catch (err) {
      console.error("图片上传失败", err);
      throw err;
    }
  },

  async onSubmitReport(e) {
    // Get values from form submission event
    const { sn, phone, description } = e.detail.value;

    if (!sn) return wx.showToast({ title: '请输入设备码', icon: 'none' });
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return wx.showToast({ title: '手机号格式错误', icon: 'none' });
    if (!description) return wx.showToast({ title: '请填写故障描述', icon: 'none' });

    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 1. Upload Images
      const imageIds = await this.uploadImages(this.data.tempImages);

      // 2. Submit Data
      const submitData = {
        productSn: sn,
        contactPhone: phone,
        description: description,
        photos: imageIds
      };

      const result = await formAPI.uploadIssueForm(submitData);
      const res = result.result || result;

      if (res && (res.success || res.code === 200 || res.code === 0)) {
        wx.hideLoading();
        wx.showModal({
          title: '提交成功',
          content: '您的报修申请已收到',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        throw new Error(res.msg || res.message || '提交失败');
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
})