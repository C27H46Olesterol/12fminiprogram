// pages/login/login.js
Page({
  data: {
  },

  onLoad() {
    console.log('登录页面加载');
    // 延迟检查登录状态，确保页面先渲染
    setTimeout(() => {
      
    }, 500);
  },

  //后端连接登陆逻辑
  async wxLogin(e){
    //生产
    const code = e.detail.code;
    if(!code){
      wx.showToast({
        title:"请确认授权登陆",
        icon:"error"
      })
      return
    }
    console.log("登陆开始");
    wx.login({
      success: res => {
        console.log("成功获取code",res.code);
        if (res.code) {
          // 获取用户信息
          wx.request({
            url: 'https://ha.musenyu.cn/auth/login',
            method: 'POST',
            data: {
              clientId: '2aeeae6eada0ddca866d775707cc5b11',
              grantType: 'xcx',
              xcxCode: res.code,
              phoneCode:code,
              appid: 'wxa81a2077330256cf',
              tenantId: "000000"
            },
            success: loginRes => {
              // 登录成功，保存 token
              console.log("res",loginRes)
              const userInfo ={
                userName:'用户'+loginRes.data.data.openid.slice(0, 5)
              }
              wx.setStorageSync('hasUserInfo',true)
              wx.setStorageSync('token', 'Bearer '+loginRes.data.data.access_token)
              wx.setStorageSync('userInfo',userInfo)
              wx.setStorageSync('clientid', '2aeeae6eada0ddca866d775707cc5b11')
              console.log("token",wx.getStorageSync('token'))
              console.log("clientid",wx.getStorageSync('clientid'))
              console.log("userInfo",wx.getStorageSync('userInfo'))
              wx.navigateBack()
            },
            fail: err=>{
              wx.showToast({
                title:"网络问题，请检查网络或者联系服务人员",
                icon:"error"
              })
            }
          })
        }
      }
    })
  },

  async testLogin(){
    const userInfo={
      userName:'testUser',
      userPhone:'123456789',
      openid:'Ifaeg^&*dfaw',
    }
    wx.setStorageSync("userInfo",userInfo);
    wx.setStorageSync('hasUserInfo',true)
    wx.setStorageSync('token', 'test_token')
    wx.setStorageSync('clientid', 'test_clientid')
    wx.navigateBack()
  },
});
