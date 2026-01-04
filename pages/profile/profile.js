const app = getApp();
const formAPI = require("../../utils/formAPI.js");
const FormData = require("../../utils/formdata.js");

Page({
  data: {
    hasUserInfo: false,
    userInfo: {}
  },
  onShow() {
    this.checkLoginStatus();
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 2
      })
    }
  },

  async checkLoginStatus() {
    const userInfo = app.globalData.userInfo;
    const hasUserInfo = app.globalData.userInfo;

    if (hasUserInfo && userInfo) {
      this.setData({
        hasUserInfo: true,
        userInfo: userInfo
      });
    }
  },

  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的登录信息
          app.logout();
          // 跳转到登录页
          wx.reLaunch({
            url: '/pages/login/login'
          });
        }
      }
    })
  },

  goManual() {
    wx.navigateTo({
      url: '/pages/manual/manual',
    })
  },

  goDevices() {
    // wx.navigateTo({
    //   url: '/pages/client/devices/devices',
    // })
    wx.showToast({
      title: '功能开发中！',
      icon:'success'
    })
  },

  goActivateLog() {
    // wx.navigateTo({
    //   url: '/pages/worker/activateLog/activateLog',
    // })
    wx.showToast({
      title: '功能开发中！',
      icon:'success'
    })
  },

  goIssuesLog() {
    // wx.navigateTo({
    //   url: '/pages/client/issuesLog/issuesLog',
    // })
    wx.showToast({
      title: '功能开发中！',
      icon:'success'
    })
  },

  goRepairLog() {
    // wx.navigateTo({
    //   url: '/pages/worker/repairLog/repairLog',
    // })
    wx.showToast({
      title: '功能开发中！',
      icon:'success'
    })
  },

  goWorker() {
    // wx.navigateTo({
    //   url: '/pages/worker/worker',
    // })
    wx.showToast({
      title: '功能开发中！',
      icon:'success'
    })
  },

  goRepair() {
    // wx.navigateTo({
    //   url: '/pages/worker/repair/repair'
    // })
    wx.showToast({
      title: '功能开发中！',
      icon:'success'
    })
  },

  // goResign() {
  //   wx.navigateTo({
  //     url: '/pages/profile/resign/resign',
  //   })
  // },

  async goApply() {
    const res = await app.apiRequest('/system/user/applyRepairmanRole', 'POST');
    if (res.data.code === 200) {
      const userInfo = app.globalData.userInfo;
      // userInfo.userRole.push('维修工')
      console.log('接口调用成功:', userInfo)
    }
  },

  async getUserRole() {
    // const result =await app.apiRequest('/system/user/getInfo','GET');
    // const roles = result.data.user.roles
    // const userRole = roles.map(i=>i.roleName)
    console.log('userInfo', this.data.userInfo)
  },

  //接口测试
  async apiTest() {
    // this.getUserRole();
    // this.goApply();
    wx.chooseMedia({
      count: 3,
      sizeType: ['compressed'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        // const newImages = [...currentImages, ...res.tempFilePaths];
        console.log("选择的图片",res.tempFiles)
        const result = this.uploadImages(res.tempFiles);
        console.log("上传图片",result)
      }
    });

  },

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

  //本地身份更改测试
  roleChange() {
    const userInfo = app.globalData.userInfo
    if (userInfo.userRole === '维修工') {
      userInfo.userRole = '普通用户'
    }
    else {
      userInfo.userRole = '维修工'
    }
    app.globalData.userInfo = userInfo
    wx.showLoading({ title: "加载中", mask: true })
    this.onShow();
    setTimeout(() => {
      wx.hideLoading();
    }, 1000);
  }
})
