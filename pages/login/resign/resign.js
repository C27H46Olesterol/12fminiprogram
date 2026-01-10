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
      userName: '',
      contactPhone: '',
      distributors: [''],
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

    wx.navigateTo({
      url: '/pages/index',
    })
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

  onUserNameInput(e) {
    this.setData({
      'formData.userName': e.detail.value
    });
    this.checkCanSubmit();
  },

  onContactPhoneInput(e) {
    this.setData({
      'formData.contactPhone': e.detail.value
    });
    this.checkCanSubmit();
  },

  // 经销商信息处理
  onDistributorInput(e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const distributors = [...this.data.formData.distributors];
    distributors[index] = value;
    this.setData({
      'formData.distributors': distributors
    });
  },

  onAddDistributor() {
    const distributors = [...this.data.formData.distributors, ''];
    this.setData({
      'formData.distributors': distributors
    });
  },

  onRemoveDistributor(e) {
    const index = e.currentTarget.dataset.index;
    const distributors = [...this.data.formData.distributors];
    distributors.splice(index, 1);
    this.setData({
      'formData.distributors': distributors
    });
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

  // 图片上传逻辑
  uploadFile(filePath) {
    return new Promise((resolve, reject) => {
      const baseURL = "https://ha.musenyu.cn"
      wx.uploadFile({
        url: baseURL + '/resource/oss/upload',
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': wx.getStorageSync("token"),
          'clientid': wx.getStorageSync("clientid")
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            if (data.code === 200 || data.code === 0) {
              resolve(data.data.url || data.data); // 根据后端返回结构调整
            } else {
              reject(new Error(data.msg || '上传失败'));
            }
          } catch (e) {
            reject(new Error('解析上传结果失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },

  // 检查是否可提交
  checkCanSubmit() {
    const { storeName, storeAddress, userName, contactPhone, storeImages, licenseImages } = this.data.formData;
    const isValid = storeName.trim() &&
      storeAddress.trim() &&
      userName.trim() &&
      contactPhone.trim() &&
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
      const { formData } = this.data;

      // 1. 上传图片 (这里由于接口只接收单个字符串，通常取第一张)
      let storePhoto = '';
      if (formData.storeImages.length > 0) {
        storePhoto = await this.uploadFile(formData.storeImages[0]);
      }

      let businessLicense = '';
      if (formData.licenseImages.length > 0) {
        businessLicense = await this.uploadFile(formData.licenseImages[0]);
      }

      // 2. 构造提交参数
      const payload = {
        storeName: formData.storeName,
        repairName: formData.userName,
        storeAddress: formData.storeAddress,
        storePhoto: storePhoto,
        businessLicense: businessLicense,
        contactName: formData.userName,
        contactPhone: formData.contactPhone,
        // 如果后端支持，也可以把经销商信息带上
        distributors: formData.distributors.filter(item => item.trim() !== '')
      };

      // 3. 提交数据
      const result = await app.apiRequest('/pro/repairInfo/submit', 'POST', payload);

      if (result && (result.code === 200 || result.code === 0)) {
        wx.hideLoading();
        wx.showToast({
          title: '提交成功，请等待审核',
          icon: 'success',
          duration: 2000
        });

        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        throw new Error(result.msg || '提交失败');
      }

    } catch (error) {
      console.error('申请提交失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      });
      this.setData({ isSubmitting: false });
    }
  }
})

