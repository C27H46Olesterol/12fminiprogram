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
    // this.initCloud();

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
  
  //无感登陆
  async moodLogin(){
    
  },

  //手机号授权登陆
  async apiRequest(api, method = 'GET', data = {}){
    return new Promise((resolve, reject) => {
      const baseURL="https://ha.musenyu.cn"
      wx.request({
        url:baseURL+api,
        method:method,
        data:data,
        header:{
          'Authorization':wx.getStorageSync("token"),
          'clientid':wx.getStorageSync("clientid")
        },
        success:(res)=>{
          if(res.statusCode === 200){
            console.log("调用api成功",baseURL+api)
            console.log("res1",res)
            resolve(res.data);
          }
          else{
            resolve({
              errMsg:'接口调用失败',
              statusCode:res.statusCode
            })
          }
        },
        fail:(err)=>{
          reject({
            errMsg:err.msg,
            statusCode:err.statusCode
          });
        },
        complete:(res)=>{
          // console.log("url",baseURL+api)
          // console.log("data",data)
        }
      })
    })
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
    console.log("用户已退出")
    
    setTimeout(() => {
        wx.navigateBack();
    }, 1500);
   
  }
});
