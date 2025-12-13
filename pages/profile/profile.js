// pages/profile/profile.js
const app = getApp();
const auth = require('../../utils/auth');

Page({
  data: {
    userInfo: null,
    userRole: null,
    isAdmin: false,
    longPressTimer: null,
    longPressCount: 0,
    showRoleSwitchModal: false,
    roleList: [
      {
        value: 'client',
        name: '客户',
        desc: '查看服务进度，提交服务需求',
        icon: '👤'
      },
      {
        value: 'worker',
        name: '维修工',
        desc: '接收工单，执行维修任务',
        icon: '🔧'
      },
      {
        value: 'manager',
        name: '主管',
        desc: '管理工单，分配任务，查看统计',
        icon: '👨‍💼'
      },
      {
        value: 'admin',
        name: '超级管理员',
        desc: '系统管理，用户管理，数据统计',
        icon: '⚙️'
      }
    ]
  },

  onLoad() {
    this.loadUserInfo();
    this.watchDeviceData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4
      })
    }
    this.loadUserInfo();
    const userInfo = wx.getStorageSync('userInfo')
    console.log('当前用户信息userInfo', userInfo)
  },

  //接口测试
  async fastAPITest() {
    const userInfo = wx.getStorageSync('userInfo')
    const userId = userInfo.userId
    const phone = userInfo.phone
    const result = await wx.cloud.callFunction({
      name: 'onenet',
      data: {
        action: "setCommand",
        // userId: userId,
        // phone: phone
      },
    })
    console.log("测试接口返回结果：", result)
  },

  async fastAPITest2() {
    // const result = await wx.cloud.callFunction({
    //   name: 'huaweicloud',
    //   data: {
    //     action: "sendMessagetoDevice"
    //   }
    // })
    // console.log("测试接口返回结果：", result)
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = auth.getUserInfo();
    const userRole = auth.getUserRole();
    const isAdmin = app.globalData.isAdmin;

    this.setData({
      userInfo,
      userRole,
      isAdmin
    });
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  watchDeviceData() {
    const db = wx.cloud.database();
    const _ = db.command;
    
    this.watcher = db.collection('device_data')
      .where({
        deviceId: 'your-device-id'
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .watch({
        onChange: (snapshot) => {
          if (snapshot.docs.length > 0) {
            this.setData({
              deviceData: snapshot.docs[0]
            });
          }
        },
        onError: (err) => {
          console.error('监听失败:', err);
        }
      });
  },

  // 头像长按开始
  onAvatarLongPressStart() {
    this.setData({
      longPressTimer: setTimeout(() => {
        this.checkAdminAccess();
      }, 3000)
    });
  },

  // 头像长按结束
  onAvatarLongPressEnd() {
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.setData({ longPressTimer: null });
    }
  },

  // 检查管理员权限
  async checkAdminAccess() {
    // 只有主管角色才能尝试激活超级管理员权限
    if (this.data.userRole !== 'manager') {
      app.showError('只有主管才能激活超级管理员权限');
      return;
    }

    try {
      app.showLoading('验证中...');

      const res = await app.request({
        url: '/api/admin/check-access',
        method: 'GET'
      });

      if (res.success) {
        app.setAdminStatus(true);
        this.setData({ isAdmin: true });
        app.showSuccess('超级管理员权限已激活');

        // 跳转到管理员页面
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/admin/user-management/user-management'
          });
        }, 1500);
      } else {
        app.showError('权限验证失败，请联系系统管理员');
      }
    } catch (error) {
      console.error('管理员权限验证失败:', error);
      app.showError('权限验证失败，请检查网络连接');
    } finally {
      app.hideLoading();
    }
  },

  // 跳转到用户管理页面
  goToUserManagement() {
    wx.navigateTo({
      url: '/pages/admin/user-management/user-management',
      fail: (err) => {
        console.error('跳转用户管理页面失败:', err);
        app.showError('页面跳转失败');
      }
    });
  },

  // 跳转到系统设置页面
  goToSystemSettings() {
    wx.showToast({
      title: '系统设置功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 跳转到数据统计页面
  goToDataStatistics() {
    wx.showToast({
      title: '数据统计功能开发中',
      icon: 'none',
      duration: 2000
    });
  },

  // 关于我们
  goToAbout() {
    wx.showModal({
      title: '关于我们',
      content: '颐尔福驻车空调售后反馈小程序\n版本：1.0.0\n\n专业的驻车空调售后服务，为您提供优质的服务体验。',
      showCancel: false
    });
  },

  // 帮助中心
  goToHelp() {
    wx.navigateTo({
      url: '/pages/client/faq/faq'
    });
  },

  // 联系客服
  callCustomerService() {
    wx.makePhoneCall({
      phoneNumber: '400-123-4567',
      fail: () => {
        app.showError('拨号失败');
      }
    });
  },

  // 退出登录
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          app.logout();
        }
      }
    });
  },

  // 获取角色显示文本
  getRoleText(role) {
    const roleMap = {
      'client': '客户',
      'manager': '主管',
      'worker': '维修工',
      'admin': '管理员'
    };
    return roleMap[role] || '未知';
  },

  // 显示角色切换弹窗
  showRoleSwitchModal() {
    this.setData({
      showRoleSwitchModal: true
    });
  },

  // 隐藏角色切换弹窗
  hideRoleSwitchModal() {
    this.setData({
      showRoleSwitchModal: false
    });
  },

  // 切换角色
  switchRole(e) {
    const role = e.currentTarget.dataset.role;

    // 如果选择的是当前角色，直接关闭弹窗
    if (role === this.data.userRole) {
      this.hideRoleSwitchModal();
      return;
    }

    wx.showModal({
      title: '切换角色',
      content: `确定要切换到${this.getRoleName(role)}角色吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performRoleSwitch(role);
        }
      }
    });
  },

  // 执行角色切换
  performRoleSwitch(role) {
    // 创建新的测试用户信息
    const testUserInfo = {
      id: 'test_user_' + role + '_001',
      nickname: this.getRoleName(role) + '测试账号',
      avatar: '/images/default-avatar.png',
      openid: 'test_openid_' + role + '_001',
      token: 'test_token_' + Date.now()
    };

    const testUserRole = role;
    const testIsAdmin = role === 'admin';

    console.log('切换角色:', { testUserInfo, testUserRole, testIsAdmin });

    // 保存到全局数据
    app.globalData.userInfo = testUserInfo;
    app.globalData.userRole = testUserRole;
    app.globalData.isAdmin = testIsAdmin;

    // 保存到本地存储
    wx.setStorageSync('userInfo', testUserInfo);
    wx.setStorageSync('userRole', testUserRole);
    wx.setStorageSync('isAdmin', testIsAdmin);

    // 更新页面数据
    this.setData({
      userInfo: testUserInfo,
      userRole: testUserRole,
      isAdmin: testIsAdmin
    });

    this.hideRoleSwitchModal();

    wx.showToast({
      title: '角色切换成功',
      icon: 'success',
      duration: 2000
    });

    // 跳转到对应角色的首页
    setTimeout(() => {
      app.redirectToHomePage(testUserRole);
    }, 2000);
  },

  // 获取角色名称
  getRoleName(role) {
    const roleMap = {
      'client': '客户',
      'worker': '维修工',
      'manager': '主管',
      'admin': '超级管理员'
    };
    return roleMap[role] || '未知角色';
  }
});
