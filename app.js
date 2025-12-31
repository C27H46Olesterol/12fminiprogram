// app.js
App({
  globalData: {
    userInfo: '',
    hasUserInfo: false
  },

  onLaunch() {
    console.log('App启动');

    // 初始化云开发
    // this.initCloud();

    // 获取系统信息
    this.getSystemInfo();
    // 不在app.js中检查登录状态，让各页面自己处理
    // 这样可以避免在登录页面被重定向

    this.getUser()
  },

  //通过缓存获取用户信息
  getUser(){
    console.log('检查缓存用户信息')
    this.globalData.hasUserInfo = wx.getStorageSync('hasUserInfo')
    this.globalData.userInfo = wx.getStorageSync('userInfo')
    this.globalData.clientid = wx.getStorageSync('clientid')
    this.globalData.token = wx.getStorageSync('token')

    console.log("缓存登陆信息校验1：hasUserInfo:", this.globalData.hasUserInfo)
    console.log("缓存登陆信息校验2：userInfo:", this.globalData.userInfo)
    console.log("缓存登陆信息校验3：token:", this.globalData.clientid)
    console.log("缓存登陆信息校验4：clientid:", this.globalData.token)
    if(this.globalData.hasUserInfo && this.globalData.userInfo && this.globalData.clientid && this.globalData.token){
      console.log('缓存存在用户信息，直接登陆')
      wx.reLaunch({
        url: '/pages/index',
      })
    }else{
    }
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


  //api通过ji
  async apiRequest(api, method = 'GET', data = {}, contentType='application/json'){
    return new Promise((resolve, reject) => {
      const baseURL="https://ha.musenyu.cn"
      // const baseURL = 'http://192.168.70.27:8080'
      wx.request({
        url:baseURL+api,
        method:method,
        data:data,
        header:{
          'Authorization':wx.getStorageSync("token"),
          'clientid':wx.getStorageSync("clientid"),
          'Content-Type':contentType
        },
        success:(res)=>{
          if(res.statusCode === 200){
            console.log("调用api成功",baseURL+api)
            console.log("调用结果",res.data)
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
    this.globalData.hasUserInfo = false;

    // 清除本地缓存
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('hasUserInfo');
    wx.removeStorageSync('token');
    wx.removeStorageSync('clientid');
    wx.removeStorageSync('myProductsList')
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
