// pages/client/activate/activate.js
const app = getApp();
const formAPI = require("../../../utils/formAPI");
const FormData = require("../../../utils/formdata");

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
    location: null, // 存储定位信息

    // 校验信息
    validations: {
      productCode: { isValid: true, msg: '' },
      licensePlate: { isValid: true, msg: '' },
      userPhone: { isValid: true, msg: '' },
      installerPhone: { isValid: true, msg: '' }
    }
  },

  onLoad() {
    this.initPage();
  },

  initPage() {
    // 自动填充手机号逻辑
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    // 根据 login.js 的存储结构，手机号字段应为 userPhone
    const userPhone = userInfo && (userInfo.userPhone || userInfo.phone || userInfo.phoneNumber);

    if (userPhone) {
      // 在维修工端激活界面，默认将当前登录用户的手机号填入“安装师傅手机号”字段
      this.setData({
        'formData.installerPhone': userPhone
      });
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
    const val = e.detail.value;
    this.setData({ 'formData.productCode': val });
    this.validateField('productCode', val);
  },

  onLicensePlateInput(e) {
    const val = e.detail.value;
    this.setData({ 'formData.licensePlate': val });
    this.validateField('licensePlate', val);
  },

  onUserPhoneInput(e) {
    const val = e.detail.value;
    this.setData({ 'formData.userPhone': val });
    this.validateField('userPhone', val);
  },

  onInstallerPhoneInput(e) {
    const val = e.detail.value;
    this.setData({ 'formData.installerPhone': val });
    this.validateField('installerPhone', val);
  },

  // 单字段校验逻辑
  validateField(field, value) {
    let isValid = true;
    let msg = '';
    const phoneRegex = /^1[3-9]\d{9}$/;

    switch (field) {
      case 'productCode':
        if (!value.trim()) {
          isValid = false;
          msg = '请输入产品序列号';
        }
        break;
      case 'licensePlate':
        if (!value.trim()) {
          isValid = false;
          msg = '请输入车牌号码';
        } else if (value.length < 7) {
          isValid = false;
          msg = '车牌号码格式不正确';
        }
        break;
      case 'userPhone':
        if (!value) {
          isValid = false;
          msg = '请输入用户手机号';
        } else if (!phoneRegex.test(value)) {
          isValid = false;
          msg = '手机号格式错误';
        }
        break;
      case 'installerPhone':
        if (!value) {
          isValid = false;
          msg = '请输入安装师傅手机号';
        } else if (!phoneRegex.test(value)) {
          isValid = false;
          msg = '手机号格式错误';
        }
        break;
    }

    this.setData({
      [`validations.${field}`]: { isValid, msg }
    }, () => {
      this.checkCanSubmit();
    });
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
      mediaType: ['image', 'video'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newPaths = res.tempFiles.map(file => file.tempFilePath);
        const newImages = [...currentImages, ...newPaths];
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
    const { formData, validations } = this.data;

    // 检查所有必填项是否填写且照片已上传
    const hasRequiredValues =
      formData.productCode.trim() !== '' &&
      formData.licensePlate.trim() !== '' &&
      formData.userPhone.trim() !== '' &&
      formData.installerPhone.trim() !== '' &&
      formData.processImages.length > 0 &&
      formData.finishImages.length > 0;

    // 检查是否有失败的校验
    const hasValidationErrors = Object.values(validations).some(v => !v.isValid);

    this.setData({ canSubmit: hasRequiredValues && !hasValidationErrors });
  },

  // 上传多张图片到服务器
  async uploadImages(imagePaths) {
    if (!imagePaths || imagePaths.length === 0) return [];

    const uploadPromises = imagePaths.map(async (path) => {
      let formData = new FormData();
      formData.appendFile("file", path);
      let data = formData.getData();
      try {
        const res = await formAPI.uploadImg(data);
        return res; // Assuming res contains the url or object from backend
      } catch (err) {
        console.error("单个图片上传失败:", path, err);
        throw err;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      console.log("所有图片上传成功:", results);
      return results;
    } catch (err) {
      console.error("图片批量上传失败", err);
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
      // 2. 准备提交数据
      const payload = {
        productSn: eventData.productSn || this.data.formData.productCode,
        driverPhone: eventData.driverPhone || this.data.formData.userPhone,
        customerPhone: eventData.customerPhone || this.data.formData.installerPhone,
        licensePlate: eventData.licensePlate || this.data.formData.licensePlate,
        installProcessPhotos: processImgsUrl.join(','),
        installCompletePhotos: finishImgsUrl.join(','),
        installStatus: "1", // 1 为已完成
        installTime: new Date().toISOString()
      };

      console.log('正在发送安装记录:', payload);
      const res = await app.apiRequest('/pro/installRecord', 'POST', payload);

      if (res && (res.code === 200 || res.code === 0)) {
        wx.hideLoading();
        wx.showToast({
          title: '审核提交成功',
          icon: 'success',
          duration: 2000
        });
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        throw new Error(res.msg || '提交失败');
      }

    } catch (error) {
      console.error('提交失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交过程发生错误',
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
})