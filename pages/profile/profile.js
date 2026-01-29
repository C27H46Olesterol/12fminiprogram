const app = getApp();
const formAPI = require("../../utils/formAPI.js");
const FormData = require("../../utils/formdata.js");

Page({
  data: {
    hasUserInfo: false,
    userInfo: ''
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

  checkLoginStatus() {
    if (app.globalData.hasUserInfo && app.globalData.userInfo) {
      this.setData({
        hasUserInfo: app.globalData.hasUserInfo,
        userInfo: app.globalData.userInfo
      });
      console.log("缓存登陆信息校验1：hasUserInfo：", this.data.hasUserInfo)
      console.log("缓存登陆信息校验2：usserInfo", this.data.userInfo)
    } else {
      console.log('用户未登录')
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
    wx.navigateTo({
      url: '/pages/client/devices/devices',
    })
    // wx.showToast({
    //   title: '功能开发中！',
    //   icon:'success'
    // })
  },

  goActivateLog() {
    wx.navigateTo({
      url: '/pages/worker/activateLog/activateLog',
    })
  },

  goMyInventory() {
    wx.navigateTo({
      url: '/pages/worker/myInventory/myInventory',
    })
  },

  goIssuesLog() {
    wx.navigateTo({
      url: '/pages/client/issuesLog/issuesLog',
    })
    // wx.showToast({
    //   title: '功能开发中！',
    //   icon:'success'
    // })
  },

  goRepairLog() {
    wx.navigateTo({
      url: '/pages/worker/repairLog/repairLog',
    })
    // wx.showToast({
    //   title: '功能开发中！',
    //   icon:'success'
    // })
  },

  goWorker() {
    wx.navigateTo({
      url: '/pages/worker/worker',
    })
    // wx.showToast({
    //   title: '功能开发中！',
    //   icon:'success'
    // })
  },

  goRepair() {
    wx.navigateTo({
      url: '/pages/worker/repair/repair'
    })
    // wx.showToast({
    //   title: '功能开发中！',
    //   icon:'success'
    // })
  },

  goResign() {
    wx.navigateTo({
      url: '/pages/login/resign/resign',
    })
  },

  goDealer() {
    wx.navigateTo({
      url: '/pages/login/dealer/dealer',
    })
  },

  goUpdate() {
    wx.navigateTo({
      url: '/pages/profile/update/update',
    })
  },

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
    wx.chooseMedia({
      count: 2,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: async (res) => {
        console.log("选择的图片", res.tempFiles);
        try {
          wx.showLoading({ title: '上传中...' });
          const results = await this.uploadImages(res.tempFiles);
          console.log("上传成功结果:", results);
          wx.hideLoading();
          wx.showToast({ title: '上传完成' });
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '上传出错', icon: 'error' });
        }
      }
    });
  },

  async uploadImages(imagePaths) {
    console.log("开始上传图片:", imagePaths.map(path => path.tempFilePath));

    // 为每个图片路径创建一个上传 Promise
    const uploadPromises = imagePaths.map(async (path) => {
      let formData = new FormData();
      formData.appendFile("file", path.tempFilePath);
      let data = formData.getData();
      try {
        const res = await formAPI.uploadImg(data);
        return res;
      } catch (err) {
        console.error(`图片 ${path.tempFilePath} 上传失败`, err);
        throw err;
      }
    });

    try {
      const results = await Promise.all(uploadPromises);
      console.log("所有图片上传成功:", results);
      return results;
    } catch (err) {
      console.error("部分图片上传失败", err);
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
