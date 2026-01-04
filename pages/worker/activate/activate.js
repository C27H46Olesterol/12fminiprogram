// pages/client/activate/activate.js
const app = getApp();
const formAPI = require("../../../utils/formAPI");

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
    // this.getCurrentLocation();

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

    wx.chooseMedia({
      count: maxCount,
      mediaType: ['image','video'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newImages = [...currentImages, ...res.tempFiles.tempFilePath];
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
      phoneRegex.test(formData.installerPhone) &&
      formData.processImages.length > 0 &&
      formData.finishImages.length > 0;
    // console.log("图片提交长度：", formData.processImages.length)
    // console.log("表单内容是否可以提交：", isValid)
    this.setData({ canSubmit: isValid });
  },

  // 上传多张图片到服务器
  async uploadImages(imagePaths) {
    console.log(imagePaths.map(path => path.tempFilePath))
    let formData = new FormData();

    imagePaths.map(path => {
      formData.appendFile("file",path.tempFilePath);
    });

    let data = formData.getData();
    const uploadPromises = formAPI.uploadImg(data);
    try {
      const results = await Promise.all(uploadPromises);
      console.log("上传图片结果", results);
      // 假设接口直接返回url或id，这里直接返回结果数组
      return results;
    } catch (err) {
      console.error("图片上传失败", err);
      throw err;
    }
  },

  // 提交表单
  async onSubmit(e) {
    if (!this.data.canSubmit) return;

    // 再次检查定位，如果之前失败了
    // if (!this.data.location) {
    //   wx.showToast({
    //     title: '正在获取定位...',
    //     icon: 'loading'
    //   });
    //   this.getCurrentLocation();
    //   // 给定位一点时间，或者直接允许提交但标记无定位
    //   // 这里选择必须有定位才能提交
    //   setTimeout(() => {
    //     if (!this.data.location) {
    //       wx.showToast({
    //         title: '无法获取定位，请检查权限',
    //         icon: 'none'
    //       });
    //     } else {
    //       this.startSubmit();
    //     }
    //   }, 1000);
    //   return;
    // }

    const formDataFromEvent = e.detail.value; // Get data from form submit event
    this.startSubmit(formDataFromEvent);
  },

  async startSubmit(eventData) {
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 1. 上传图片
      const processImageIds = await this.uploadImages(this.data.formData.processImages);
      const finishImageIds = await this.uploadImages(this.data.formData.finishImages);
      let processImgsUrl = processImageIds.map(url => url.url);
      let finishImgsUrl = finishImageIds.map(url => url.url);
      // 2. 准备提交数据 - use eventData preferred, fallback to data
      // eventData keys match 'name' attributes: productSn, licensePlate, driverPhone, customerPhone
      const formatFormData = {
        productSn: eventData.productSn || this.data.formData.productCode,
        driverPhone: eventData.driverPhone || this.data.formData.userPhone,
        customerPhone: eventData.customerPhone || this.data.formData.installerPhone,
        licensePlate: eventData.licensePlate || this.data.formData.licensePlate,
        installProcessPhotos: processImgsUrl.toString(),
        installCompletePhotos: finishImgsUrl.toString()
      }

      const result = await formAPI.uploadInstallForm(formatFormData);
      // 实际的业务返回值在 result.data 中
      const res = result.data;
      console.log('提交返回', res)
      if (res.code === 200) {
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