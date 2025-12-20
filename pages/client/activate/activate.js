// pages/client/activate/activate.js
const app = getApp();

Page({
  data: {
    formData: {
      productCode: ''
    },

    // 状态
    canSubmit: false,
    isSubmitting: false
  },

  onLoad() {
    this.initPage();
  },

  initPage() {
    this.checkCanSubmit();
  },

  // 输入处理
  onProductCodeInput(e) {
    this.setData({ 'formData.productCode': e.detail.value });
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

  // 验证表单
  checkCanSubmit() {
    const { formData } = this.data;
    const isValid = formData.productCode.trim() !== '';
    this.setData({ canSubmit: isValid });
  },

  // 提交表单
  async onSubmit() {
    if (!this.data.canSubmit) return;

    this.startSubmit();
  },

  //绑定设备
  async bindDevice(){
    const sn = this.data.formData.productCode
    console.log(sn)
    const result = await app.apiRequest('/pro/banding/bind','POST',{sn:sn})
    if(result.code != 200){
      wx.showToast({
        title: result.msg,
        icon:"none"
      })
    }else{
      wx.showToast({
        title:result.msg,
        icon:'none'
      })
      wx.navigateBack()
    }
    
    console.log('result123',result)

  },

  async startSubmit() {
    this.setData({ isSubmitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      // 准备提交数据
      const userInfo = wx.getStorageSync('userInfo') || {};
      const submitTime = new Date().toISOString(); // 提交时间

      // 调用云函数
      const result = await wx.cloud.callFunction({
        name: 'activateProduct',
        data: {
          action: 'submitProductActivation',
          userId: userInfo._id || userInfo.userId,
          openId: userInfo.openid,
          submitterPhone: userInfo.phone || userInfo.phoneNumber,
          submitterRole: userInfo.role || 'user',

          productCode: this.data.formData.productCode,

          // 其他字段留空或根据后端要求调整，这里只发送保留的字段
          licensePlate: '',
          userPhone: '',
          installerPhone: '',
          installAddress: '',
          processImages: [],
          finishImages: [],
          location: null,
          submitTime: submitTime
        }

      });
      console.log('云函数返回:', result);

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
      wx.hideLoading();
      wx.showModal({
        title: '提交失败',
        content: error.message || error + '',
        showCancel: false,
        confirmText: '确定'
      })
      console.error('提交失败:', error);
    } finally {
      this.setData({ isSubmitting: false });
    }
  }
})
