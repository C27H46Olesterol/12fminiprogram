// pages/client/apply-worker/apply-worker.js
const app = getApp();

Page({
  data: {
    // 表单数据
    formData: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      storeImage: ''
    },

    // 地区选择
    region: ['', '', ''],
    regionText: '',
    customItem: '全部',

    // 状态
    canSubmit: false,
    isSubmitting: false
  },

  onLoad() {
    this.initFormData();
  },

  // 初始化表单数据
  initFormData() {
    const userInfo = app.globalData.userInfo || wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        'formData.name': userInfo.name || userInfo.nickname || '',
        'formData.phone': userInfo.phone || ''
      });
    }
    this.checkCanSubmit();
  },

  // 地区选择
  onRegionChange(e) {
    const region = e.detail.value;
    const regionText = region.join(' ');
    
    this.setData({
      region: region,
      regionText: regionText,
      'formData.province': region[0],
      'formData.city': region[1],
      'formData.district': region[2]
    });
    
    this.checkCanSubmit();
  },

  // 表单输入处理
  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value });
    this.checkCanSubmit();
  },

  onPhoneInput(e) {
    this.setData({ 'formData.phone': e.detail.value });
    this.checkCanSubmit();
  },

  // 选择图片
  onChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        this.uploadImage(tempFilePath);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 上传图片到云存储
  async uploadImage(filePath) {
    wx.showLoading({ title: '上传中...' });
    
    try {
      const cloudPath = `worker-applications/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const result = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath
      });
      
      console.log('图片上传成功:', result.fileID);
      
      this.setData({
        'formData.storeImage': result.fileID
      });
      
      this.checkCanSubmit();
      
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('图片上传失败:', error);
      wx.showToast({
        title: '上传失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 删除图片
  onDeleteImage() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张照片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'formData.storeImage': ''
          });
          this.checkCanSubmit();
        }
      }
    });
  },

  // 预览图片
  onPreviewImage() {
    wx.previewImage({
      urls: [this.data.formData.storeImage],
      current: this.data.formData.storeImage
    });
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { formData } = this.data;
    
    const isNameValid = formData.name && formData.name.trim().length >= 2;
    const isPhoneValid = formData.phone && /^1[3-9]\d{9}$/.test(formData.phone);
    const isProvinceValid = formData.province && formData.province.trim() !== '';
    const isCityValid = formData.city && formData.city.trim() !== '';
    const isImageValid = formData.storeImage && formData.storeImage.trim() !== '';
    
    const canSubmit = isNameValid && isPhoneValid && isProvinceValid && 
                      isCityValid && isImageValid;
    
    this.setData({ canSubmit });
  },

  // 提交申请
  async onSubmit() {
    if (!this.data.canSubmit) {
      const { formData } = this.data;
      let errorMsg = '';
      
      if (!formData.name || formData.name.trim().length < 2) {
        errorMsg += '请输入真实姓名（至少2个字符）\n';
      }
      if (!formData.phone || !/^1[3-9]\d{9}$/.test(formData.phone)) {
        errorMsg += '请输入正确的手机号\n';
      }
      if (!formData.province || !formData.city) {
        errorMsg += '请选择工作地区\n';
      }
      if (!formData.storeImage) {
        errorMsg += '请上传门头照片\n';
      }
      
      wx.showModal({
        title: '信息不完整',
        content: errorMsg.trim(),
        showCancel: false
      });
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userId = userInfo._id || userInfo.userId;
      const userPhone = userInfo.phone || userInfo.phoneNumber;
      
      console.log('提交维修工申请:', {
        ...this.data.formData,
        userId,
        userPhone
      });

      // 调用云函数提交申请
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'submitWorkerApplication',
          userId: userId,
          userPhone: userPhone,
          name: this.data.formData.name,
          phone: this.data.formData.phone,
          province: this.data.formData.province,
          city: this.data.formData.city,
          storeImage: this.data.formData.storeImage
        }
      });

      console.log('提交结果:', result);

      if (result.result && result.result.success) {
        wx.showModal({
          title: '提交成功',
          content: '您的申请已提交，请等待审核。审核结果将通过消息通知您。',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        throw new Error(result.result?.message || '提交失败');
      }
    } catch (error) {
      console.error('提交申请失败:', error);
      wx.showModal({
        title: '提交失败',
        content: error.message || '网络错误，请稍后重试',
        showCancel: false
      });
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
});
