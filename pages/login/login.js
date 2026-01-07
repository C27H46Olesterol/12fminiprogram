const { getResolvedIssues } = require("../../utils/api");

// pages/login/login.js
const app = getApp();
Page({
  data: {
    userInfo: '',
    agreed: false,
    showAgreementModal: false,
    modalTitle: '',
    modalContent: '',

    //位置返回信息
    locationRes: '',
    loading: false
  },

  onLoad() {
    console.log('登录页面加载');
  },

  async onShow() {
    try {
      const res = await this.getLocationPromise();
      console.log('提前获取位置成功', res);
      this.setData({
        locationRes: res
      });
    } catch (err) {
      console.warn('提前获取位置被拒绝或失败', err);
    }
    // wx.getLocation({
    //   type:'gcj02',
    //   success(res){
    //     console.log('获取地址成功')
    //   },
    //   fail(err){
    //     console.log('获取地址失败')
    //     wx.showToast({
    //       title:'请打开地址授权',
    //       icon:'error'
    //     })
    //   }
    // })
  },

  getLocationPromise() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: resolve,
        fail: reject
      })
    });
  },

  loginPromise() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      })
    })
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

    const phoneCode = e.detail.code;
    if (!phoneCode) {
      wx.showToast({
        title: "请确认授权登陆",
        icon: "none"
      })
      return
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '登录中' });

    try {
      // 1. 确保有地理位置
      let locationRes = this.data.locationRes;
      if (!locationRes) {
        try {
          // 如果 onShow 没采集到，这里再次触发授权弹窗
          locationRes = await this.getLocationPromise();
          this.setData({ locationRes });
        } catch (err) {
          console.error('获取位置失败', err);
          wx.showToast({ title: '请授权地理位置以完成登录', icon: 'none' });
          this.setData({ loading: false });
          wx.hideLoading();
          return;
        }
      }

      // 2. 获取 wx.login code
      const loginRes = await this.loginPromise();
      console.log('登陆code获取成功', loginRes.code);

      // 3. 发送登录请求
      wx.request({
        url: 'https://ha.musenyu.cn/auth/login',
        method: 'POST',
        data: {
          clientId: '2aeeae6eada0ddca866d775707cc5b11',
          grantType: 'xcx',
          xcxCode: loginRes.code,
          phoneCode: phoneCode,
          appid: 'wxa81a2077330256cf',
          tenantId: "000000",
          latitude: locationRes.latitude,
          longitude: locationRes.longitude,
          speed: locationRes.speed,
          accuracy: locationRes.accuracy,
          altitude: locationRes.altitude
        },
        success: (res) => {
          if (res.data.code === 200) {
            console.log("登录成功res", res);
            wx.setStorageSync('token', 'Bearer ' + res.data.data.access_token);
            wx.setStorageSync('clientid', '2aeeae6eada0ddca866d775707cc5b11');

            // 4. 获取用户信息并跳转
            this.getUser();
          } else {
            wx.showToast({
              title: res.data.msg || '登录失败',
              icon: 'none'
            });
            this.setData({ loading: false });
          }
        },
        fail: err => {
          console.error('登录请求失败', err);
          wx.showToast({
            title: "服务器连接失败",
            icon: "none"
          });
          this.setData({ loading: false });
        },
        complete: () => {
          wx.hideLoading();
        }
      });
    } catch (error) {
      console.error('登录流程异常', error);
      this.setData({ loading: false });
      wx.hideLoading();
    }
  },

  async getUser() {
    try {
      const res = await app.apiRequest('/system/user/getInfo', 'GET');
      if (res.code === 200) {
        const user = res.data.user;
        const roles = user.roles;
        const userInfo = {
          userName: '用户' + user.userName,
          userRole: roles,
          userPhone: user.userName
        };

        let userRoleNames = roles.map(i => i.roleName);
        let displayRole = userRoleNames.includes("维修工") ? "维修工" : "用户";

        const finalUserInfo = {
          ...userInfo,
          userRole: displayRole
        };

        this.setData({ userInfo: finalUserInfo });
        wx.setStorageSync('userInfo', finalUserInfo);
        wx.setStorageSync('hasUserInfo', true);

        wx.showToast({ title: '登录成功', icon: 'success' });

        setTimeout(() => {
          wx.redirectTo({
            url: '/pages/login/role/role'
          });
        }, 1000);
      } else {
        throw new Error(res.msg || '获取用户信息失败');
      }
    } catch (error) {
      console.error('获取用户信息失败', error);
      wx.showToast({ title: '获取身份失败', icon: 'none' });
      this.setData({ loading: false });

    }
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

  toggleLocationAgreement() {
    // 已删除手动授权逻辑
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
