// pages/client/index/index.js
const app = getApp();
var timer = require("../../../utils/wxTimer")

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    userLocation: null, // 用户位置信息
    myProducts: [], // 产品用户：已激活产品列表
    session_key: '', //微信登陆凭证
    deviceData: null,
    lastUpdateTime: '',
    openid: '', //用户唯一标识
    showDropdown: false, // 下拉菜单显示状态
    showDeviceModal: false, // 设备选择弹窗显示状态

    // Remote Control Data (Moved from remote.js)
    deviceInfo: {
      sn: '',
      imei: ''
    },
    deviceList: [],
    selectedDeviceIndex: -1,
    selectedDevice: null,
    deviceStatus: {
      online: true,
      temperature: 25,
      humidity: 60,
      voltage: 12.5,
      runtime: 245,
      outletTemp: 22,
      inletTemp: 28,
      signalStrength: 0,
      faultCode: '' // 故障码，空字符串表示无故障
    },
    wxTimerList: {},
    remoteState: {
      powerOn: false,
      windSpeed: 1,
      lightingOn: false,
      targetTemperature: 26,
      mode: 'auto', // auto, strong, eco, heat
      swingUpDown: false,
      swingLeftRight: false
    }
  },

  onLoad() {
    console.log('加载页面')
    if (this.data.hasUserInfo) {
      wx.showLoading();
    }
    this.UserInfoStorageCheck();
    this.initPage();
    if (this.data.hasUserInfo) {
      this.loadRoleData(); // 加载角色专属数据
      this.initDeviceSelection(); // 初始化设备选择
    }
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)
  },

  onShow() {
    console.log("用户登陆状态", this.data.hasUserInfo);
    if (this.data.hasUserInfo) {
      wx.showLoading();
    }
    console.log("显示client/index")
    this.UserInfoStorageCheck();
    if (this.data.hasUserInfo) {
      this.loadRoleData(); // 加载角色专属数据
      this.initDeviceSelection(); // 初始化设备选择
    }
    setTimeout(() => {
      wx.hideLoading();
    }, 800)
    console.log("client/index加载完毕")
  },

  //缓存信息检查
  UserInfoStorageCheck() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true
      })
    }
  },

  // 初始化页面
  initPage() {
    console.log('客户端首页初始化');
    const userInfo = app.globalData.userInfo;
    console.log('全局用户信息:', userInfo);
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
      });
    } else {
      this.setData({
        hasUserInfo: false,
      });
    }
  },

  // 加载角色专属数据
  async loadRoleData() {
    const userInfo = wx.getStorageSync('userInfo')
    const role = userInfo.role;
    console.log('检测用户身份', role)
    if (role === 'client') {
      console.log('设置产品用户专用栏')
      // 加载已激活产品
      const myProductsList = await this.formatActivateProduct()

      this.setData({
        myProducts: myProductsList
      })
      this.loadRecentFeedbacks()

    }
  },

  //加载用户已激活产品
  async formatActivateProduct() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    try {
      const result = await wx.cloud.callFunction({
        name: 'activateProduct',
        data: {
          action: 'getActivationByPhoneNumber',
          phoneNumber: userInfo.phone,
        }
      })

      console.log('云函数返回结果:', result);

      // 检查云函数调用是否成功
      if (result && result.result) {
        const cloudResult = result.result;

        // 检查云函数业务逻辑是否成功
        if (cloudResult.success && cloudResult.data) {
          const res = cloudResult.data;
          // 将云函数返回的数据转换为myProducts格式，只包含必要字段
          return res.map((item, index) => ({
            id: index + 1,
            name: item.productCode,
            image: item.finishImages && item.finishImages.length > 0 ? item.finishImages[0] : '',
            status: 'active'
          }));
        } else {
          console.log('云函数业务逻辑失败或无数据:', cloudResult.message);
          return [];
        }
      } else {
        console.error('云函数调用失败');
        return [];
      }
    } catch (error) {
      console.error('获取激活产品时发生错误:', error);
      return [];
    }
  },

  // 跳转登录
  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 跳转产品详情
  onProductDetail(e) {
    const { id, productCode, image } = e.currentTarget.dataset;

    if (productCode) {
      wx.navigateTo({
        url: `/pages/client/product-detail/product-detail?productCode=${productCode}&image=${encodeURIComponent(image || '')}`
      });
    } else {
      wx.showToast({ title: '产品信息获取失败', icon: 'none' });
    }
  },

  // 产品图片点击 - 预览大图
  onProductImageTap(e) {
    const { image } = e.currentTarget.dataset;

    if (image) {
      wx.previewImage({
        current: image,
        urls: [image]
      });
    } else {
      wx.showToast({ title: '暂无图片', icon: 'none' });
    }
  },

  // 产品名称点击 - 跳转详情
  onProductNameTap(e) {
    const { productCode } = e.currentTarget.dataset;
    console.log('点击跳转', productCode)
    if (productCode) {
      wx.navigateTo({
        url: `/pages/client/product-detail/product-detail?productCode=${productCode}`
      });
    }
  },

  // 产品状态点击 - 显示状态详情
  onProductStatusTap(e) {
    const { productCode, status } = e.currentTarget.dataset;

    const statusText = status === 'active' ? '质保中' : '已过保';
    const message = status === 'active'
      ? '您的设备正处于质保期内，如有问题可享受免费维修服务。'
      : '您的设备已过保，如需维修服务需支付相应费用。';

    wx.showModal({
      title: `设备状态：${statusText}`,
      content: message,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 头像加载错误处理
  onAvatarError(e) {
    console.log('头像加载失败，使用默认头像', e);
    this.setData({
      'userInfo.avatarUrl': ''
    });
  },

  // 加载最近反馈
  async loadRecentFeedbacks() {
    try {
      const feedbacks = await this.getRecentFeedbacksFromCloud();
      this.setData({
        recentFeedbacks: feedbacks
      });
    } catch (error) {
      console.error('加载反馈失败:', error);
    }
  },

  // 从云函数获取最近反馈
  async getRecentFeedbacksFromCloud() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userPhone = userInfo.phone || userInfo.phoneNumber;
      const userId = userInfo._id || userInfo.userId;

      if (!userId) return [];

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getClientIssues',
          phone: userPhone,
          userId: userId,
          limit: 3 // 首页只显示最近3条
        }
      });

      if (result.result && result.result.success) {
        const issues = result.result.data || [];
        return issues.map(issue => ({
          id: issue.issueId || issue._id,
          title: issue.issueId || issue._id,
          description: issue.description,
          status: issue.status,
          statusText: this.getStatusText(issue.status),
          createTime: this.formatTime(issue.createTime),
          hasRated: issue.satisfaction > 0
        }));
      }

      return [];
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      return [];
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      console.log(' 开始获取当前位置...');
      wx.getLocation({
        type: 'gcj02',
        success: async (res) => {
          console.log(' 位置获取成功:', res);
          try {
            const locationInfo = await wx.cloud.callFunction({
              name: "auth",
              data: {
                action: "reverseGeocode",
                latitude: res.latitude,
                longitude: res.longitude
              }
            })
            this.setData({
              userLocation: locationInfo
            });
          } catch (error) {
            wx.showToast({
              title: '地理解析失败',
              icon: 'error'
            })
          }
        },
        fail: (err) => {
          console.log(' 位置获取失败:', err);
          this.setData({
            userLocation: { city: '定位失败', address: '无法获取位置信息' }
          });
        }
      });
    } catch (error) {
      console.error('获取位置出错', error);
      this.setData({
        userLocation: { city: '定位异常', address: '位置获取异常' }
      });
    }
  },

  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  getStatusText(status) {
    const statusMap = {
      'pending': '待处理',
      'assigned': '已分配',
      'processing': '处理中',
      'parts_sent': '配件已发出',
      'parts_received': '返件已收到',
      'resolved': '已解决',
      'closed': '已关闭',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知状态';
  },

  // 切换下拉菜单显示状态
  toggleDropdown() {
    this.setData({
      showDropdown: !this.data.showDropdown
    });
  },

  onActivateProduct() {
    if (!this.data.hasUserInfo) {
      // 未登录，存储目标页面后跳转登录
      wx.setStorageSync('redirectAfterLogin', '/pages/client/activate/activate');
      wx.navigateTo({ url: '/pages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/pages/client/activate/activate' });
  },

  onViewFeedback(e) {
    const feedbackId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/client/feedback/feedback?id=${feedbackId}&mode=view`
    });
  },

  // 退出登陆
  onLogout() {
    wx.showModal({
      title: '退出登陆',
      content: '确定要退出登陆吗?',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储的用户信息
          wx.removeStorageSync('userInfo');
          // 清除全局用户信息
          app.globalData.userInfo = null;
          // 重置页面数据
          this.setData({
            userInfo: null,
            hasUserInfo: false,
            showDropdown: false,
            myProducts: [],
            recentFeedbacks: [],
            deviceList: [],
            selectedDeviceIndex: -1,
            selectedDevice: null
          });
          wx.showToast({
            title: '已退出登陆',
            icon: 'success'
          });
        }
      }
    });
  },

  // 接口测试
  onApiTest() {
    this.setData({
      showDropdown: false
    });
    wx.showModal({
      title: '接口测试',
      content: '这是一个接口测试功能,您可以在这里添加具体的测试逻辑',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  // 添加服务
  onAddService() {
    wx.navigateTo({
      url: '/pages/client/feedback/feedback'
    });
  },

  // --- Remote Control Methods (Moved from remote.js) ---

  async initDeviceSelection() {
    const userInfo = wx.getStorageSync('userInfo');
    const savedImei = wx.getStorageSync('selectedDeviceImei');
    await this.getDeviceInfo(userInfo, savedImei);
  },

  // 切换设备选择弹窗
  toggleDeviceModal() {
    if (!this.data.hasUserInfo) {
      this.onGoLogin();
      return;
    }
    this.setData({
      showDeviceModal: !this.data.showDeviceModal
    });
  },

  // 选择设备
  onSelectDevice(e) {
    const index = e.currentTarget.dataset.index;
    const device = this.data.deviceList[index];
    this.setData({
      selectedDeviceIndex: index,
      selectedDevice: device,
      showDeviceModal: false
    });
    wx.setStorageSync('selectedDeviceImei', device.imei);
    wx.showToast({
      title: `已切换至 ${device.sn || '新设备'}`,
      icon: 'none'
    });
    // 切换设备后加载状态
    this.loadDeviceStatus();
  },

  // onDeviceChange(e) {
  //   const index = e.detail.value;
  //   const device = this.data.deviceList[index];
  //   this.setData({
  //     selectedDeviceIndex: index,
  //     selectedDevice: device
  //   });
  //   wx.setStorageSync('selectedDeviceImei', device.imei);
  //   wx.showToast({
  //     title: `已切换至 ${device.sn || '新设备'}`,
  //     icon: 'none'
  //   });
  //   // 切换设备后加载状态
  //   this.loadDeviceStatus();
  // },

  async timerTest() {
    var timerTest = new timer({
      beginTime: '00:00:05',
      name: "timerTest",
      complete: function () {
        wx.showToast({
          title: '定时响应',
        })
        console.log('计时结束')
      }
    })
    console.log('计时开始')
    timerTest.start(this);
  },

  //初始化设备信息 获取用户的所有激活的设备
  async getDeviceInfo(userInfo, savedImei) {
    try {
      wx.showLoading({ title: '加载设备中...' });
      if (!userInfo) {
        wx.hideLoading();
        return;
      }
      const userId = userInfo.userId;
      const phone = userInfo.phone;

      const res = await wx.cloud.callFunction({
        name: 'onenet',
        data: {
          action: "getActiveDeviceList",
          userId: userId,
          phone: phone
        },
      });

      if (res.result && res.result.data) {
        const deviceList = res.result.data;
        let selectedIndex = -1;
        console.log("deviceList:", deviceList)
        if (savedImei) {
          selectedIndex = deviceList.findIndex(d => d.imei === savedImei);
        }

        // 如果没找到之前的设备，默认选第一个
        if (selectedIndex === -1 && deviceList.length > 0) {
          selectedIndex = 0;
          wx.setStorageSync('selectedDeviceImei', deviceList[0].imei);
        }

        this.setData({
          deviceList: deviceList,
          selectedDeviceIndex: selectedIndex,
          selectedDevice: selectedIndex !== -1 ? deviceList[selectedIndex] : null
        });
      }
    } catch (error) {
      console.error("获取设备列表失败：", error);
      wx.showToast({ title: '获取设备失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 加载设备状态
  async loadDeviceStatus() {
    try {
      const device = this.data.selectedDevice;
      if (!device) return;

      const result = await wx.cloud.callFunction({
        name: 'onenet',
        data: {
          action: 'getDviceStatus',
          deviceName: device.imei
        }
      })
      console.log("设备状态返回", result.result);

      // 暂时使用模拟数据
      const mockStatus = {
        online: Math.random() > 0.1, // 90%概率在线
        temperature: Math.floor(Math.random() * 10) + 20, // 20-30°C
        humidity: Math.floor(Math.random() * 20) + 50, // 50-70%
        voltage: (Math.random() * 2 + 11).toFixed(1), // 11-13V
        runtime: Math.floor(Math.random() * 500) + 100, // 100-600h
        outletTemp: Math.floor(Math.random() * 5) + 18,
        inletTemp: Math.floor(Math.random() * 5) + 25,
        signalStrength: Math.floor(Math.random() * 5), // 0-4 信号强度
        faultCode: Math.random() > 0.8 ? 'E01' : '' // 模拟故障码
      };

      this.setData({ deviceStatus: mockStatus });
    } catch (error) {
      console.error('加载设备状态失败:', error);
    }
  },

  // 开关机
  togglePower() {
    const result = wx.cloud.callFunction({
      name: 'onenet',
      data: {
        action: 'setOn',
        deviceName: 'onenet_mqtt'
      }
    })
    if (result.success) {
      this.setData({
        'remoteState.powerOn': true
      });
      wx.showToast({
        title: '已开机',
        icon: 'success',
        duration: 2000
      });
    } else {
      wx.showToast({
        title: '开机失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  // 增加风速
  increaseWindSpeed() {
    if (!this.checkPower()) return;
    let speed = this.data.remoteState.windSpeed;
    if (speed < 5) {
      this.setData({
        'remoteState.windSpeed': speed + 1
      });
    } else {
      wx.showToast({ title: '已是最大风速', icon: 'none' });
    }
  },

  // 减少风速
  decreaseWindSpeed() {
    if (!this.checkPower()) return;
    let speed = this.data.remoteState.windSpeed;
    if (speed > 1) {
      this.setData({
        'remoteState.windSpeed': speed - 1
      });
    } else {
      wx.showToast({ title: '已是最小风速', icon: 'none' });
    }
  },

  // 增加温度
  increaseTemperature() {
    if (!this.checkPower()) return;
    let temp = this.data.remoteState.targetTemperature;
    if (temp < 30) {
      this.setData({
        'remoteState.targetTemperature': temp + 1
      });
    } else {
      wx.showToast({ title: '已是最高温度', icon: 'none' });
    }
  },

  // 减少温度
  decreaseTemperature() {
    if (!this.checkPower()) return;
    let temp = this.data.remoteState.targetTemperature;
    if (temp > 16) {
      this.setData({
        'remoteState.targetTemperature': temp - 1
      });
    } else {
      wx.showToast({ title: '已是最低温度', icon: 'none' });
    }
  },

  // 照明开关
  toggleLighting() {
    if (!this.checkPower()) return;
    const newStatus = !this.data.remoteState.lightingOn;
    this.setData({
      'remoteState.lightingOn': newStatus
    });
    this.showControlToast(newStatus ? '照明已开启' : '照明已关闭');
  },

  // 强劲模式
  setStrongMode() {
    if (!this.checkPower()) return;
    if (this.data.remoteState.mode === 'strong') {
      this.setAutoMode();
    } else {
      this.setData({
        'remoteState.mode': 'strong',
        'remoteState.windSpeed': 5 // 强劲模式自动最大风速
      });
      this.showControlToast('强劲模式');
    }
  },

  // 自动模式
  setAutoMode() {
    if (!this.checkPower()) return;
    this.setData({
      'remoteState.mode': 'auto',
      'remoteState.windSpeed': 3 // 自动模式默认中等风速
    });
    this.showControlToast('自动模式');
  },

  // 节能模式
  setEcoMode() {
    if (!this.checkPower()) return;
    if (this.data.remoteState.mode === 'eco') {
      this.setAutoMode();
    } else {
      this.setData({
        'remoteState.mode': 'eco',
        'remoteState.windSpeed': 1 // 节能模式默认最小风速
      });
      this.showControlToast('节能模式');
    }
  },

  // 制热模式
  toggleHeating() {
    if (!this.checkPower()) return;
    if (this.data.remoteState.mode === 'heat') {
      this.setAutoMode();
    } else {
      this.setData({
        'remoteState.mode': 'heat'
      });
      this.showControlToast('制热模式');
    }
  },

  // 上下摆风开关
  toggleSwingUpDown() {
    if (!this.checkPower()) return;
    const newStatus = !this.data.remoteState.swingUpDown;
    this.setData({
      'remoteState.swingUpDown': newStatus
    });
    this.showControlToast(newStatus ? '上下摆风已开启' : '上下摆风已关闭');
  },

  // 左右摆风开关
  toggleSwingLeftRight() {
    if (!this.checkPower()) return;
    const newStatus = !this.data.remoteState.swingLeftRight;
    this.setData({
      'remoteState.swingLeftRight': newStatus
    });
    this.showControlToast(newStatus ? '左右摆风已开启' : '左右摆风已关闭');
  },

  // 辅助函数：检查电源状态
  checkPower() {
    if (!this.data.remoteState.powerOn) {
      wx.showToast({ title: '请先开机', icon: 'none' });
      return false;
    }
    return true;
  },

  // 辅助函数：显示控制反馈
  showControlToast(title) {
    wx.showToast({
      title: title,
      icon: 'none',
      duration: 1000
    });
  },

});
