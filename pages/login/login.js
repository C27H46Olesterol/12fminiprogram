// pages/login/login.js
Page({
  data: {
    loading: false,
    userInfo: null,
    phone: ''
  },

  onLoad() {
    console.log('登录页面加载');
    
    // 延迟检查登录状态，确保页面先渲染
    setTimeout(() => {
      this.checkLoginStatus();
    }, 500);
  },

  // 检查登录状态
  checkLoginStatus() {
    //开始登陆
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    
    if (userInfo && token) {
      this.setData({ userInfo });
      console.log('用户已登录:', userInfo);
      
      const app = getApp();
      app.globalData.userInfo = userInfo;
      // app.globalData.userRole = userInfo.role;
      // app.globalData.isAdmin = userInfo.role === 'admin';
      // app.globalData.isManager = userInfo.role === 'manager';
      // app.globalData.isWorker = userInfo.role === 'worker';
      // app.globalData.isClient = userInfo.role === 'client';

      // this.navigateByRole(userInfo.role);
      wx.navigateBack({
        success:function(){
          prevPage.onLoad();
        }
      });
    }
  },

  // 微信授权获取手机号登录
  onGetPhoneNumber(e) {
    console.log('用户点击了获取手机号按钮', e.detail)
  
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      return
    }

    const code = e.detail.code
    if (!code) {
      wx.showToast({
        title: '微信手机号授权登陆失败',
        icon:'none'
      })      
      return
    }

    console.log('成功:获取到phoneCode:', code)
    this.getUserPhone(code)
  },

  /**
   * 将phoneCode和openId一起传给服务端获取手机号
   */
  getUserPhone(phoneCode) {
    wx.cloud.callFunction({
      name: 'userLogin',
      data: {
        type: 'getPhoneNumber',
        code: phoneCode,
      },
      success: (res) => {
        console.log('步骤4成功: 获取到手机号并完成登录', res.result)
        
        if (res.result.success) {
          // 保存用户信息
          wx.setStorageSync('userInfo', res.result.data.userInfo)

          const app = getApp();
          app.globalData.userInfo = res.result.data.userInfo;
          // app.globalData.userRole = res.result.data.userInfo.role;
          // app.globalData.isAdmin = res.result.data.userInfo.role === 'admin';
          // app.globalData.isManager = res.result.data.userInfo.role === 'manager';
          // app.globalData.isWorker = res.result.data.userInfo.role === 'worker';
          // app.globalData.isClient = res.result.data.userInfo.role === 'client';
          
          wx.hideLoading()
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 2000
          })
          
          // 延迟跳转
          setTimeout(() => {
            this.navigateByRole(res.result.data.userInfo.role);
          }, 1000);
        } else {
          wx.hideLoading()
          wx.showToast({
            title: res.result.errMsg || '登录失败',
            icon: 'none'
          })
        }
      },
      fail: (error) => {
        console.error('步骤4失败: 云函数调用失败', error)
        wx.hideLoading()
        wx.showToast({
          title: '登录失败，请稍后重试',
          icon: 'none'
        })
      }
    })
  },



  
  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync('userInfo');
          wx.removeStorageSync('token');
          
          this.setData({
            userInfo: null,
            loading: false
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },


  // 手机号登录
  async phoneNumberLogin() {
    const { phone } = this.data;
    
    if (!phone) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      });
      return;
    }

    if (!phone.match(/^1[3456789]\d{9}$/)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    try {
      console.log('开始手机号登录:', phone);
      
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'phoneNumberLogin',
          phone: phone
        }
      });

      console.log('手机号登录结果:', result);

      if (result.result && result.result.success) {
        const { userInfo, token } = result.result.data;
        
        // // 规范化 phone 与 phoneNumber 字段
        // const normalizedPhone = {
        //   ...userInfo,
        //   phone: userInfo.phone || userInfo.phoneNumber || '',
        //   phoneNumber: userInfo.phoneNumber || userInfo.phone || ''
        // };
        
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('token', token);
        
        const app = getApp();
        app.globalData.userInfo = userInfo;
        // app.globalData.userRole = normalizedPhone.role;
        // app.globalData.isAdmin = normalizedPhone.role === 'admin';
        // app.globalData.isManager = normalizedPhone.role === 'manager';
        // app.globalData.isWorker = normalizedPhone.role === 'worker';
        // app.globalData.isClient = normalizedPhone.role === 'client';

        //本地保存？
        this.setData({
          userInfo: userInfo
        });

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        //延时根据角色跳转
        // setTimeout(() => {
        //   this.navigateByRole(userInfo.role);
        // }, 1500);
        wx.navigateBack();
      } else {
        console.log('登录失败:', result.result);
        wx.showToast({
          title: result.result?.message || '登录失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('登录错误:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },
  
  
  //后端连接登陆逻辑
  async wxLogin(e){
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
                userName:''
              }
              userInfo.userName = '用户'+loginRes.data.data.openid.slice(0, 5)
              wx.setStorageSync('token', 'Bearer '+loginRes.data.data.access_token)
              wx.setStorageSync('userInfo',userInfo)
              wx.setStorageSync('clientid', '2aeeae6eada0ddca866d775707cc5b11')
              console.log("token",wx.getStorageSync('token'))
              console.log("clientid",wx.getStorageSync('clientid'))
              console.log("userInfo",wx.getStorageSync('userInfo'))
              wx.navigateBack({
                success:function(){
                  prevPage.onLoad();
                }
              })
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
});
