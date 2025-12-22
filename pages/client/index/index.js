// pages/client/index/index.js
const app = getApp();
var timer = require("../../../utils/wxTimer")
// const rp = require("request-promise")

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
      mode: 'off', // auto, strong, eco, heat,off
      swingUpDown: false,
      swingLeftRight: false,
      clock: false
    }
    ,
    // 定时弹窗相关
    showTimerModal: false,
    timerMinutes: 60, // 初始为 60 分钟
    // 定时刷新的状态
    showRefreshNotify: false,
    formattedTimer: '1 小时'
  },

  onLoad() {
    console.log('加载页面')
    console.log("hasUserInfo", this.data.hasUserInfo)
    if (this.data.hasUserInfo) {
      wx.showLoading();
    }
    else {
      console.log('没有信息 开始跳转')
      wx.navigateTo({
        url: '/pages/login/login',
      })
    }
    this.UserInfoStorageCheck();
    this.initPage();
    if (this.data.hasUserInfo) {
      this.loadRoleData(); // 加载角色专属数据
      // this.initDeviceSelection(); // 初始化设备选择
    }
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)
    // this.freshSign();
    wx.stopPullDownRefresh()

    // 启动定时任务
    this.resetInactivityTimer();
  },

  onPullDownRefresh: function () {
    this.onLoad();
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
      // this.initDeviceSelection(); // 初始化设备选择
    }
    setTimeout(() => {
      wx.hideLoading();
    }, 800)
    console.log("client/index加载完毕")

    // 页面显示时重置计时
    this.resetInactivityTimer();
  },

  onHide() {
    this.clearAllTimers();
  },

  onUnload() {
    this.clearAllTimers();
  },


  async testAPI() {
    app.apiRequest({
      api: '/pro/banding/bind',
      method: 'POST',
      data: { 'sn': "123" }
    })
  },

  async freshSign() {
    await wx.cloud.callFunction({
      name: "onenet",
      data: {
        action: "freshSign"
      }
    })
    console.log('刷新token')
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
    if (userInfo) {
      console.log('加载已激活产品')
      // 加载已激活产品
      const myProductsList = await this.formatActivateProduct()

      this.setData({
        myProducts: myProductsList
      })

      // 更新设备列表 (用于下拉菜单和遥控)
      if (myProductsList && myProductsList.length > 0) {
        const savedImei = wx.getStorageSync('selectedDeviceImei');
        let selectedIndex = -1;
        if (savedImei) {
          selectedIndex = myProductsList.findIndex(d => d.imei === savedImei);
        }

        // 如果没找到之前的设备，默认选第一个
        if (selectedIndex === -1) {
          selectedIndex = 0;
          if (myProductsList[0].imei) {
            wx.setStorageSync('selectedDeviceImei', myProductsList[0].imei);
          }
        }

        this.setData({
          deviceList: myProductsList,
          selectedDeviceIndex: selectedIndex,
          selectedDevice: myProductsList[selectedIndex]
        });

        // 加载设备状态
        this.loadDeviceStatus();
      } else {
        this.setData({
          deviceList: [],
          selectedDeviceIndex: -1,
          selectedDevice: null
        });
      }

      // this.loadRecentFeedbacks()

    }
  },


  //加载用户已激活产品
  async formatActivateProduct() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    try {
      const result = await app.apiRequest('/pro/banding/my', 'GET');
      console.log("返回数据", result);

      // 检查调用是否成功
      if (result && result.data) {
        const res = result.data;
        return res.map((item, index) => ({
          id: index + 1,
          name: item.sn,
          sn: item.sn, // 兼容现有逻辑
          imei: item.imei, // 兼容现有逻辑
          activationDate: this.formatTime(item.createTime) || '--',
          warrantyDate: this.formatTime(item.expireTime) || '--',
          image: item.finishImages && item.finishImages.length > 0 ? item.finishImages[0] : '',
          status: 'active'
        }));
      } else {
        console.error('API调用失败或无数据');
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
    this.resetInactivityTimer();
    this.setData({
      showDropdown: !this.data.showDropdown,
      showDeviceModal: false // 互斥显示
    });
  },

  // 关闭所有下拉菜单 (点击外部时触发)
  closeAllDropdowns() {
    this.resetInactivityTimer();
    if (this.data.showDropdown || this.data.showDeviceModal) {
      this.setData({
        showDropdown: false,
        showDeviceModal: false
      });
    }
  },

  // 空操作，仅用于阻止冒泡
  noOp() { },

  onActivateProduct() {

    if (!this.data.hasUserInfo) {
      // 未登录，存储目标页面后跳转登录
      wx.setStorageSync('redirectAfterLogin', '/pages/client/activate/activate');
      wx.showToast({
        title: '请先登陆',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 500)

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
    wx.vibrateShort({ type: 'heavy' });
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
    this.resetInactivityTimer();
    this.setData({
      showDeviceModal: !this.data.showDeviceModal,
      showDropdown: false // 互斥显示
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
    this.resetInactivityTimer();
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
    wx.vibrateShort({ type: 'heavy' });
    // 打开定时弹窗（前端）
    if (!this.checkPower()) {
      this.setData({
        'remoteState.clock': false
      })
      return
    };
    this.setData({
      showTimerModal: true,
      timerMinutes: 60, // 默认 1 小时
      'remoteState.clock': true
    });
  },

  // 增减定时（步长 30 分钟），限制在 60 - 480
  changeTimer(e) {
    wx.vibrateShort({ type: 'heavy' });
    const delta = parseInt(e.currentTarget.dataset.delta, 10) || 0;
    let m = this.data.timerMinutes + delta;
    if (m < 60) m = 60;
    if (m > 480) m = 480;

    this.setData({
      timerMinutes: m,
      formattedTimer: this.formatTimer(m)
    });
    this.resetInactivityTimer();
  },

  closeTimerModal() {

    this.setData({ showTimerModal: false });
  },

  async confirmTimer() {

    const minutes = this.data.timerMinutes;

    // 格式化为 HH:mm:ss 供 wxTimer 使用
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const formattedHMS = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

    // 停止之前的计时器（如果存在）
    if (this.timerInstance) {
      this.timerInstance.stop();
      this.timerInstance = null;
    }

    // 先清除 UI 展示，防止旧数据闪烁
    let wxTimerList = this.data.wxTimerList;
    delete wxTimerList['timerBtn'];
    this.setData({ wxTimerList });

    // 初始化计时器
    const timerInstance = new timer({
      beginTime: formattedHMS,
      name: 'timerBtn',
      complete: () => {
        wx.showToast({ title: '定时结束', icon: 'none' });
        // 清理状态
        let list = this.data.wxTimerList;
        delete list['timerBtn'];
        this.setData({
          wxTimerList: list,
          'remoteState.clock': false
        });
        this.timerInstance = null;
      }
    });

    timerInstance.start(this);
    this.timerInstance = timerInstance;

    this.setData({
      showTimerModal: false
    });

    this.resetInactivityTimer();
    wx.showToast({ title: `已设置定时 ${this.data.formattedTimer}`, icon: 'none' });
  },

  formatTimer(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (m === 0) return `${h} 小时`;
    return `${h} 小时 ${m} 分钟`;
  },

  // 返回基础小时数（1 - 8 小时）字符串
  formatBaseHours(mins) {
    let h = Math.ceil((mins || 0) / 60);
    if (h < 1) h = 1;
    if (h > 8) h = 8;
    return `${h} 小时`;
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

  // --- 自动刷新与不活跃计时逻辑 ---

  // 启动/重置不活跃计时器 (10秒 - 测试用)
  resetInactivityTimer() {
    this.setData({ showRefreshNotify: false });

    // 清除旧的计时器
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
    }

    // 启动新的不活跃计时器
    this.inactivityTimeoutId = setTimeout(() => {
      this.stopAutoRefresh();
    }, 10 * 1000); // 10秒 (测试用)

    // 如果刷新定时器没启动，则启动它
    if (!this.refreshIntervalId) {
      this.startAutoRefresh();
    }
  },

  // 开启自动刷新 (每30秒)
  startAutoRefresh() {
    if (this.refreshIntervalId) return;

    console.log('开启自动刷新设备状态');
    this.refreshIntervalId = setInterval(() => {
      this.loadDeviceStatus();
    }, 30 * 1000); // 30秒刷新一次
  },

  // 停止自动刷新并弹出提示
  stopAutoRefresh() {
    console.log('超过10秒未操作，停止自动刷新');
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    this.setData({ showRefreshNotify: true });
  },

  // 清除所有定时器 (用于生命周期注销)
  clearAllTimers() {
    if (this.inactivityTimeoutId) {
      clearTimeout(this.inactivityTimeoutId);
      this.inactivityTimeoutId = null;
    }
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  // 点击通知恢复刷新
  resumeRefresh() {
    wx.vibrateShort({ type: 'light' });
    this.resetInactivityTimer();
  },

  // 开关机
  togglePower() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    const isPowerOn = this.data.remoteState.powerOn;
    const newPowerState = !isPowerOn;

    // 立即更新UI状态
    this.setData({
      'remoteState.powerOn': newPowerState
    });

    if (!newPowerState) {
      // 如果关机，停止并清除定时器 (UI逻辑)
      if (this.timerInstance) {
        this.timerInstance.stop();
        this.timerInstance = null;
      }
      let wxTimerList = this.data.wxTimerList;
      if (wxTimerList.timerBtn) {
        delete wxTimerList.timerBtn;
      }

      // 重置所有功能开关至关闭/默认状态
      this.setData({
        wxTimerList,
        'remoteState.clock': false,
        'remoteState.lightingOn': false,
        'remoteState.mode': 'off',
        'remoteState.swingUpDown': false,
        'remoteState.swingLeftRight': false
      });
      wx.showToast({ title: '已关机', icon: 'none' });
    } else {
      wx.showToast({ title: '已开机', icon: 'success' });
    }

    // 使用 bufferCommand 发送指令，key为 setPower，value为目标状态(true/false)
    // this.bufferCommand('setPower', newPowerState);
  },

  // 增加风速
  increaseWindSpeed() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    let speed = this.data.remoteState.windSpeed;
    if (speed < 5) {
      const newSpeed = speed + 1;
      this.setData({
        'remoteState.windSpeed': newSpeed
      });
      wx.showToast({
        title: '风速' + newSpeed + '档',
        icon: 'none'
      })
      this.bufferCommand('setWindSpeed', newSpeed);
    } else {
      wx.showToast({ title: '已是最大风速', icon: 'none' });
    }
  },

  // 减少风速
  decreaseWindSpeed() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    let speed = this.data.remoteState.windSpeed;
    if (speed > 1) {
      const newSpeed = speed - 1;
      this.setData({
        'remoteState.windSpeed': newSpeed
      });
      wx.showToast({
        title: '风速' + newSpeed + '档',
        icon: 'none'
      })
      this.bufferCommand('setWindSpeed', newSpeed);
    } else {
      wx.showToast({ title: '已是最小风速', icon: 'none' });
    }
  },

  // 增加温度
  increaseTemperature() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    let temp = this.data.remoteState.targetTemperature;
    if (temp < 40) {
      const newTemp = temp + 1;
      this.setData({
        'remoteState.targetTemperature': newTemp
      });
      wx.showToast({
        title: '设置' + newTemp + '°C',
        icon: 'none'
      })
      this.bufferCommand('setTemperature', newTemp);
    } else {
      wx.showToast({ title: '已是最高温度', icon: 'none' });
    }
  },

  // 减少温度
  decreaseTemperature() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'light' });
    if (!this.checkPower()) return;
    let temp = this.data.remoteState.targetTemperature;
    if (temp > 5) {
      const newTemp = temp - 1;
      this.setData({
        'remoteState.targetTemperature': newTemp
      });
      wx.showToast({
        title: '设置' + newTemp + '°C',
        icon: 'none'
      })
      this.bufferCommand('setTemperature', newTemp);
    } else {
      wx.showToast({ title: '已是最低温度', icon: 'none' });
    }
  },

  // 照明开关
  toggleLighting() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    const newStatus = !this.data.remoteState.lightingOn;
    this.setData({
      'remoteState.lightingOn': newStatus
    });
    this.showControlToast(newStatus ? '照明已开启' : '照明已关闭');
    this.bufferCommand('setLighting', newStatus);
  },

  // 强劲模式
  setStrongMode() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    if (this.data.remoteState.mode === 'strong') {
      this.setAutoMode();
    } else {
      this.setData({
        'remoteState.mode': 'strong',
        'remoteState.windSpeed': 5 // 强劲模式自动最大风速
      });
      this.showControlToast('强劲模式');
      this.bufferCommand('setMode', 'strong');
    }
  },

  // 自动模式
  setAutoMode() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    this.setData({
      'remoteState.mode': 'auto',
      'remoteState.windSpeed': 3 // 自动模式默认中等风速
    });
    this.showControlToast('自动模式');
    this.bufferCommand('setMode', 'auto');
  },

  // 节能模式
  setEcoMode() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    if (this.data.remoteState.mode === 'eco') {
      this.setAutoMode();
    } else {
      this.setData({
        'remoteState.mode': 'eco',
        'remoteState.windSpeed': 1 // 节能模式默认最小风速
      });
      this.showControlToast('节能模式');
      this.bufferCommand('setMode', 'eco');
    }
  },

  // 制热模式
  toggleHeating() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    if (this.data.remoteState.mode === 'heat') {
      this.setAutoMode();
    } else {
      this.setData({
        'remoteState.mode': 'heat'
      });
      this.showControlToast('制热模式');
      this.bufferCommand('setMode', 'heat');
    }
  },

  // 上下摆风开关
  toggleSwingUpDown() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    const newStatus = !this.data.remoteState.swingUpDown;
    this.setData({
      'remoteState.swingUpDown': newStatus
    });
    this.showControlToast(newStatus ? '上下摆风已开启' : '上下摆风已关闭');
    this.bufferCommand('setSwingUpDown', newStatus);
  },

  // 左右摆风开关
  toggleSwingLeftRight() {
    this.resetInactivityTimer();
    wx.vibrateShort({ type: 'heavy' });
    if (!this.checkPower()) return;
    const newStatus = !this.data.remoteState.swingLeftRight;
    this.setData({
      'remoteState.swingLeftRight': newStatus
    });
    this.showControlToast(newStatus ? '左右摆风已开启' : '左右摆风已关闭');
    this.bufferCommand('setSwingLeftRight', newStatus);
  },

  // 指令缓存（防抖）
  bufferCommand(action, value) {
    if (!this.commandTimers) {
      this.commandTimers = {};
    }

    // 清除该动作类型的现有定时器
    if (this.commandTimers[action]) {
      clearTimeout(this.commandTimers[action]);
      delete this.commandTimers[action];
    }

    // “所有功能按钮只有设定值为true时才会向设备发送命令”
    // 定义受限的功能按钮动作列表 (注：开关机 setPower 和 模式 setMode 不受此限制，除非特定要求)
    const restrictedActions = ['setLighting', 'setSwingUpDown', 'setSwingLeftRight'];

    if (restrictedActions.includes(action) && value !== true) {
      // 如果属于受限动作且值为false，清除之前的定时器后不再发送新指令
      console.log(`[Debounce] 忽略指令 -> ${action}: ${value} (Only true allowed)`);
      return;
    }

    // 设置新定时器
    this.commandTimers[action] = setTimeout(() => {
      this.sendControlCommand(action, value);
      delete this.commandTimers[action];
    }, 1000); // 1秒内的连续操作只发送最后一次
  },

  // 发送控制指令
  async sendControlCommand(action, value) {
    const device = this.data.selectedDevice;
    // 优先使用选中设备的imei，否则使用默认
    const deviceName = device && device.imei ? device.imei : 'onenet_mqtt';

    console.log(`[Debounce] 发送指令 -> ${deviceName}: ${action} = ${value}`);

    try {
      let finalAction = action;
      let finalData = {
        action: action,
        value: value,
        deviceName: deviceName
      };

      // 特殊处理：电源开关兼容旧逻辑
      if (action === 'setPower') {
        finalData.action = value ? 'setOn' : 'setOff';
        delete finalData.value;
      }

      const res = await wx.cloud.callFunction({
        name: 'onenet',
        data: finalData
      });
      console.log('指令发送结果:', res);
    } catch (err) {
      console.error('指令发送失败:', err);
    }
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
