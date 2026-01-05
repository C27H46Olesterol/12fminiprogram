// pages/login/login.js
const app = getApp();
Page({
  data: {
    userInfo: {
      userName: '用户',
      userRole: '用户角色'
    },
    agreed: false,
    showAgreementModal: false,
    modalTitle: '',
    modalContent: ''
  },

  onLoad() {
    console.log('登录页面加载');
    // 延迟检查登录状态，确保页面先渲染
    setTimeout(() => {
    }, 500);
  },

  //后端连接登陆逻辑
  async wxLogin(e) {
    if (!this.data.agreed) {
      wx.showToast({
        title: '请先同意用户协议',
        icon: 'none'
      });
      return;
    }
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
              // url:'http://192.168.70.27:8080/auth/login',
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
      userName: '用户' + res.data.user.userName,
      userRole: res.data.user.roles,
      userPhone: res.data.user.userName
    }
    this.setData({
      userInfo: userInfo
    })
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('hasUserInfo', true)
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
  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    });
  },

  showUserAgreement() {
    this.setData({
      showAgreementModal: true,
      modalTitle: '用户协议',
      modalContent: `欢迎使用 颐尔福车载设备售后服务 小程序！

一、服务内容
本小程序为用户提供驻车空调设备的远程控制、状态监控、售后报修及操作指南浏览等服务。

二、用户义务
1. 用户应当确保提供的注册信息真、准确、完整。
2. 用户不得利用本小程序从事非法活动或干扰小程序的正常运行。
3. 用户需妥善保管账号信息，因账号保管不当导致的损失由用户自行承担。

三、知识产权
本小程序的所有权及相关知识产权均归 河南颐尔福新能源科技有限公司 所有。

四、免责声明
1. 因网络故障、系统维护等不可抗力导致的平衡中断，开发者不承担赔偿责任。
2. 开发者对用户因违反本协议导致的任何直接或间接损失不予赔偿。

五、协议修改
开发者有权根据需要修改本协议，修改后的协议将在小程序内发布并生效。`
    });
  },

  showPrivacyPolicy() {
    this.setData({
      showAgreementModal: true,
      modalTitle: '隐私保护指引',
      modalContent: `颐尔福车载设备售后服务 小程序隐私保护指引

本指引是颐尔福车载设备售后服务小程序开发者 河南颐尔福新能源科技有限公司（以下简称“开发者”）为处理你的个人信息而制定。

1. 开发者处理的信息
根据法律规定，开发者仅处理实现小程序功能所必要的信息。
开发者将在获取你的明示同意后，收集你的手机号，用途是【保障用户与产品绑定，确保产品品质保修对象正确】。
开发者将在获取你的明示同意后，收集你的位置信息，用途是【为用户提供远程遥控功能，确定用户产品正常激活】。
开发者访问你的蓝牙，用于【连接设备硬件，实现远程遥控与数据交互】。
开发者收集你选中的文件，用于确保用户产品绑定信息无误。

2. 未成年人保护
根据相关法律法规的规定，若你是14周岁以下的未成年人，你需要和你的监护人共同仔细阅读本指引，并在征得监护人明示同意后继续使用小程序服务。

3. 你的权益
3.1 关于你的个人信息，你可以通过以下方式与开发者联系，行使查询、复制、更正、删除等法定权利。
3.2 若你在小程序中注册了账号，你可以申请注销。在受理你的申请后，开发者承诺在十五个工作日内完成核查和处理。
邮箱：1198478159@qq.com

4. 开发者对信息的存储
开发者承诺，除法律法规另有规定外，开发者对你的信息的保存期限应当为实现处理目的所必要的最短时间。

5. 信息的使用规则
5.1 开发者将会在本指引所示的用途内使用收集的信息。
5.2 如开发者使用你的信息超出本指引目的或合理范围，开发者必须在变更使用目的或范围前，再次以弹窗提醒、短信等方式告知并征得你的明示同意。

6. 信息对外提供
6.1 开发者承诺，不会主动共享或转让你的信息至任何第三方，如存在确需共享或转让时，开发者应当直接征得或确认第三方征得你的单独同意。
6.2 开发者承诺，不会对外公开披露你的信息，如必须公开披露时，开发者应当向你告知公开披露的目的、披露信息的类型及可能涉及的信息，并征得你的单独同意。

7. 投诉建议
你可以通过以下方式与开发者联系；或者向微信进行投诉。
邮箱：1198478159@qq.com

更新日期：2026-01-05
生效日期：2026-01-05`
    });
  },

  closeModal() {
    this.setData({
      showAgreementModal: false
    });
  },

  agreeAndClose() {
    this.setData({
      agreed: true,
      showAgreementModal: false
    });
  },

  noOp() { }
});
