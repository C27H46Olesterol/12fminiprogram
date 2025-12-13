// app.js
App({
  globalData: {
    userInfo: null,
    userRole: null, // 'client', 'manager', 'worker', 'admin'
    version: '1.0.0',
    isAdmin: false, // 是否为超级管理员
    baseUrl: '', // 使用云函数API路由，不需要基础URL
    adminWhitelist: [
      // 在这里添加管理员的openid
      // 'your-admin-openid-here'
      'test-admin' // 临时测试管理员
    ] // 管理员白名单
  },

  onLaunch() {
    console.log('App启动');

    // 初始化云开发
    this.initCloud();

    // 获取系统信息
    this.getSystemInfo();

    // 不在app.js中检查登录状态，让各页面自己处理
    // 这样可以避免在登录页面被重定向
  },

  // 初始化云开发
  initCloud() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }

    try {
      wx.cloud.init({
        // env: 'zz123-2gc0941md5f39f54', // 云开发环境ID
        env: 'cloud1-5ga6xyav93b12d47',
        traceUser: true,
      });

      console.log('云开发初始化完成');
    } catch (error) {
      console.error('云开发初始化失败:', error);
    }
  },


  // 获取系统信息
  getSystemInfo() {
    try {
      // 兼容处理：优先使用旧API，新API可能在某些环境下不稳定
      wx.getSystemInfo({
        success: (res) => {
          this.globalData.systemInfo = res;
          console.log('系统信息获取成功:', res);
        },
        fail: (err) => {
          console.error('获取系统信息失败:', err);
          // 设置默认值，避免后续代码报错
          this.globalData.systemInfo = {
            platform: 'unknown',
            model: 'unknown',
            system: 'unknown'
          };
        }
      });
    } catch (error) {
      console.error('获取系统信息异常:', error);
      // 设置默认值
      this.globalData.systemInfo = {
        platform: 'unknown',
        model: 'unknown',
        system: 'unknown'
      };
    }
  },

  // 显示加载提示
  showLoading(title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true
    });
  },

  // 隐藏加载提示
  hideLoading() {
    wx.hideLoading();
  },

  // 显示成功提示
  showSuccess(title = '操作成功') {
    wx.showToast({
      title: title,
      icon: 'success',
      duration: 2000
    });
  },

  // 显示错误提示
  showError(title = '操作失败') {
    wx.showToast({
      title: title,
      icon: 'none',
      duration: 2000
    });
  },

  // 网络请求封装 - 使用云函数API路由
  request(options) {
    return new Promise((resolve, reject) => {
      console.log('发起云函数API请求:', {
        url: options.url,
        method: options.method || 'GET',
        data: options.data || {}
      });

      wx.cloud.callFunction({
        name: 'api',
        data: {
          action: options.action || 'getUserList',
          phoneNumber: options.phoneNumber,
          verifyCode: options.verifyCode,
          data: options.data || {},
          userInfo: this.globalData.userInfo
        },
        success: (res) => {
          console.log('云函数API请求成功:', res);

          if (res.result && res.result.success) {
            resolve(res.result);
          } else {
            console.error('API返回错误:', res.result);
            reject(res.result || { message: 'API请求失败' });
          }
        },
        fail: (err) => {
          console.error('云函数API请求失败:', err);

          // 根据错误类型提供更详细的错误信息
          let errorMessage = 'API请求失败';
          if (err.errMsg && err.errMsg.includes('timeout')) {
            errorMessage = '请求超时，请检查网络连接';
          } else if (err.errMsg && err.errMsg.includes('fail')) {
            errorMessage = '网络连接失败，请检查服务器状态';
          }

          reject({
            ...err,
            message: errorMessage
          });
        }
      });
    });
  },

  // 退出登录
  logout() {
    // 清除全局数据
    this.globalData.userInfo = null;
    this.globalData.userRole = null;
    this.globalData.isAdmin = false;

    // 清除本地缓存
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('userRole');
    wx.removeStorageSync('isAdmin');

    // 显示提示
    wx.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 1500
    });

    // 跳转到首页或登录页
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/client/index/index'
      });
    }, 1500);
  }
});
