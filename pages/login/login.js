// pages/login/login.js
const app = getApp();
Page({
  data: {
    userInfo: {
      userName: '用户',
      userRole: '用户角色'
    },
  },

  onLoad() {
    console.log('登录页面加载');
    // 延迟检查登录状态，确保页面先渲染
    setTimeout(() => {
    }, 500);
  },

  //后端连接登陆逻辑
  async wxLogin(e) {
    //生产
    const code = e.detail.code;
    if (!code) {
      wx.showToast({
        title: "请确认授权登陆",
        icon: "error"
      })
      return
    }
    console.log("登陆开始");
    wx.showLoading({
      title: '登陆中',
    }),
      wx.login({
        success: res => {
          console.log("成功获取code", res.code);
          if (res.code) {
            // 获取用户信息
            // app.apiRequest('/auth/login','POST',data={
            //   clientId: '2aeeae6eada0ddca866d775707cc5b11',
            //   grantType: 'xcx',
            //   xcxCode: res.code,
            //   phoneCode:code,
            //   appid: 'wxa81a2077330256cf',
            //   tenantId: "000000"
            // })
            wx.request({
              url: 'https://ha.musenyu.cn/auth/login',
              // url:'http://192.168.70.44:8080/auth/login',
              method: 'POST',
              data: {
                clientId: '2aeeae6eada0ddca866d775707cc5b11',
                grantType: 'xcx',
                xcxCode: res.code,
                phoneCode: code,
                appid: 'wxa81a2077330256cf',
                tenantId: "000000"
              },
              success: loginRes => {
                // 登录成功，保存 token
                console.log("res", loginRes)

                wx.setStorageSync('token', 'Bearer ' + loginRes.data.data.access_token)
                wx.setStorageSync('clientid', '2aeeae6eada0ddca866d775707cc5b11')

                console.log("token", wx.getStorageSync('token'))
                console.log("clientid", wx.getStorageSync('clientid'))
                // 登录成功后跳转到角色选择页
                this.getRole();
                wx.hideLoading();
                wx.showToast({
                  tittle: '登陆成功',
                  icon: "success"
                })
              },
              fail: err => {
                wx.showToast({
                  title: "服务器连接失败",
                  icon: "error"
                })
                wx.hideLoading();
              }
            })
          }
        }
      })


  },

  async getRole() {
    const res = await app.apiRequest('/system/user/getInfo', 'GET')
    const roles = res.data.user.roles
    const userInfo = {
      userName: '用户'+res.data.user.userName,
      userRole: res.data.user.roles,
      userPhone: res.data.user.userName
    }
    this.setData({
      userInfo: userInfo 
    })
    wx.setStorageSync('userInfo',userInfo)
    wx.setStorageSync('hasUserInfo',true)
    let userRole = roles.map(i => i.roleName)
    if (userRole.find(i => i === "维修工")) {
      userRole = "维修工"
    }
    this.setData({
      'userInfo.userRole': userRole
    })
    wx.setStorageSync('userInfo', this.data.userInfo)
    console.log("userInfo", wx.getStorageSync('userInfo'))
    wx.redirectTo({
      url: '/pages/login/role/role'
    })
  },

  async testLogin() {
    const userInfo = {
      userName: 'testUser',
      userPhone: '123456789',
      openid: 'Ifaeg^&*dfaw',
    }
    wx.setStorageSync("userInfo", userInfo);
    wx.setStorageSync('hasUserInfo', true)
    wx.setStorageSync('token', 'test_token')
    wx.setStorageSync('clientid', 'test_clientid')
    // 测试登录成功后跳转到角色选择页
    wx.redirectTo({
      url: '/pages/login/role/role'
    })
  },
});
