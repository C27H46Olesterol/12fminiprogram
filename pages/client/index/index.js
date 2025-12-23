// pages/client/index/index.js
const app = getApp();
var timer = require("../../../utils/wxTimer")
// const rp = require("request-promise")

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    token: null,
    clientid: null,
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
      temperature: 26,
      humidity: 60,
      voltage: '',
      runtime: 245,
      outletTemp: '',
      inletTemp: '',
      signalStrength: 0,
      faultCode: '' // 故障码，空字符串表示无故障
    },
    wxTimerList: {},
    remoteState: {
      powerOn: false,
      windSpeed: 1,//可调范围1-5
      lightingOn: false,
      lightSurround: false,
      lightClean: false,
      targetTemperature: 26,//可调范围5-40
      mode: 'auto', // auto, strong, eco, heat(暂无)
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
    formattedTimer: '1 小时',

    // 蓝牙相关状态
    showBluetoothModal: false,
    isSearchingBluetooth: false,
    bluetoothDevices: [],
    bluetoothSearchTimer: 30,
    connectedDevice: null, // 当前连接的蓝牙设备
    isBluetoothConnected: false,
    serviceId: '', // 蓝牙服务ID
    characteristicId: '', // 蓝牙特征值ID
    finalCommand: '',

    //错误信息
    errMsg:''
  },

  onLoad() {
    //关闭加载弹窗
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)
    
    //停止下拉刷新
    wx.stopPullDownRefresh()
    // 启动定时任务
    this.resetInactivityTimer();
  },

  //下拉刷新事件
  onPullDownRefresh: function () {
    this.onLoad();
  },

  onShow() {
    console.log("显示client/index")
    console.log()
    this.UserInfoStorageCheck()
    this.loadUserData(); // 加载角色专属数据
    console.log("client/index加载完毕")
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)
    // 页面显示时重置计时
    this.resetInactivityTimer();
  },

  onHide() {
    this.clearAllTimers();
  },

  onUnload() {
    this.clearAllTimers();
  },

  //接口测试
  async testAPI() {
    app.apiRequest({
      api: '/pro/banding/bind',
      method: 'POST',
      data: { 'sn': "123" }
    })
  },

  //缓存登陆信息检查
  UserInfoStorageCheck() {
    console.log('加载页面')
    //是否存有登陆信息
    const cHasUserInfo = wx.getStorageSync('hasUserInfo')
    const cUserInfo = wx.getStorageSync('userInfo')
    const cToken = wx.getStorageSync('token')
    const cClientid = wx.getStorageSync('clientid')

    if (cUserInfo && cToken && cClientid) {
      console.log("缓存登陆信息校验1：hasUserInfo：", cHasUserInfo)
      console.log("缓存登陆信息校验2：usserInfo", cUserInfo)
      console.log("缓存登陆信息校验3：token：", cToken)
      console.log("缓存登陆信息校验4：clientid", cClientid)
      console.log("缓存存在登陆信息，直接登陆")
      wx.showLoading();
      this.setData({
        hasUserInfo : cHasUserInfo || true,
        userInfo : cUserInfo,
        token : cToken,
        clientid : cClientid
      })
    }
    else {
      console.log('没有信息 开始跳转')
      this.onGoLogin();
    }
  },

  // 跳转登录
  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 加载用户专属数据
  async loadUserData() {
    const userInfo = this.data.userInfo
    if (userInfo) {
      console.log('加载已激活产品')
      // 加载已激活产品
      const myProductsList = await this.formatActivateProduct()

      this.setData({
        myProducts: myProductsList
      })

      wx.setStorageSync('myProductsList', myProductsList)

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

    }
  },

  //加载用户已激活产品
  async formatActivateProduct() {
    const userInfo = this.data.userInfo;
    try {
      const result = await app.apiRequest('/pro/banding/my', 'GET');
      if(result.code === 401){
        //无感登陆
      }
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
          status: 'active',
          connectionType: '4g', // 标记为4G连接
          signalStrength: 0 // 初始信号强度，后续从设备状态更新
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

  // 头像加载错误处理
  onAvatarError(e) {
    console.log('头像加载失败，使用默认头像', e);
    this.setData({
      'userInfo.avatarUrl': ''
    });
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

  //时间数据格式化
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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

  //产品激活事件
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

  // 接口测试 - 改为开启蓝牙搜索
  onApiTest() {
    wx.vibrateShort({ type: 'heavy' });
    this.setData({
      showDropdown: false,
      showBluetoothModal: true,
      bluetoothDevices: []
    });
    this.startBluetoothDiscovery();
  },

  // --- Remote Control Methods (Moved from remote.js) ---

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

  // 取消配对/删除设备
  onUnpairDevice(e) {
    const index = e.currentTarget.dataset.index;
    const device = e.currentTarget.dataset.item;
    
    wx.showModal({
      title: '提示',
      content: `确定要${device.connectionType === 'bluetooth' ? '断开' : '移除'}设备 ${device.name || device.sn} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          if (device.connectionType === 'bluetooth') {
             // 蓝牙设备断开连接
             wx.closeBLEConnection({
               deviceId: device.deviceId,
               success: (res) => {
                 console.log("断开蓝牙连接成功", res);
               },
               fail: (err) => {
                  console.error("断开蓝牙连接失败", err);
               }
             });
             this.removeDeviceFromList(index);
             wx.closeBluetoothAdapter()
             wx.showToast({ title: '已断开连接', icon: 'none' });
          } else {
             // 4G设备，尝试调用解绑接口
             try {
                // 如果是远程设备，通常需要调用解绑接口
                // 假设存在 /pro/banding/unbind，如果不存在则仅本地移除
                const res = await app.apiRequest('/pro/banding/unbind', 'POST', { sn: device.sn });
                if (res && res.code == 200) {
                    this.removeDeviceFromList(index);
                    wx.showToast({ title: '解绑成功', icon: 'success' });
                } else {
                    // 如果API调用失败（或者接口不存在返回404等），询问用户是否强制移除本地记录
                     wx.showModal({
                       title: '解绑失败',
                       content: res.msg || '无法从服务器解绑，是否仅在本地移除？',
                       success: (confirmRes) => {
                         if (confirmRes.confirm) {
                           this.removeDeviceFromList(index);
                         }
                       }
                     });
                }
             } catch (error) {
                console.error('解绑失败', error);
                // 异常情况下提示本地移除
                this.removeDeviceFromList(index);
             }
          }
        }
      }
    });
  },

  // 移除设备
  removeDeviceFromList(index) {
    let deviceList = this.data.deviceList;
    if (!deviceList || deviceList.length <= index) return;
    
    deviceList.splice(index, 1);
    
    // 如果移除的是当前选中的设备，重置选中状态
    let selectedDeviceIndex = this.data.selectedDeviceIndex;
    let selectedDevice = this.data.selectedDevice;
    
    if (selectedDeviceIndex === index) {
      if (deviceList.length > 0) {
        selectedDeviceIndex = 0;
        selectedDevice = deviceList[0];
        wx.setStorageSync('selectedDeviceImei', selectedDevice.imei);
      } else {
        selectedDeviceIndex = -1;
        selectedDevice = null;
        wx.removeStorageSync('selectedDeviceImei');
      }
    } else if (selectedDeviceIndex > index) {
      selectedDeviceIndex--; // 前面的被删了，索引减1
    }
    
    this.setData({
      deviceList,
      selectedDeviceIndex,
      selectedDevice
    });
    
    // 如果列表为空，加载状态
    if (deviceList.length === 0) {
       this.setData({
         deviceStatus: {
            online: false,
            temperature: '--',
            humidity: '--',
            voltage: '--',
            runtime: 0,
            outletTemp: '--',
            inletTemp: '--',
            signalStrength: 0,
            faultCode: ''
         },
         remoteState: {
           powerOn: false
         }
       });
    } else if (selectedDeviceIndex !== -1) {
       // 重新加载新选中设备的状态
       this.loadDeviceStatus();
    }
  },

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
        signalStrength: Math.floor(Math.random() * 5) + 1, // 1-5 信号强度
        faultCode: Math.random() > 0.8 ? 'E01' : '' // 模拟故障码
      };

      this.setData({ deviceStatus: mockStatus });

      // 更新当前选中设备的信号强度
      if (this.data.selectedDevice && this.data.selectedDevice.connectionType === '4g') {
        const deviceList = this.data.deviceList;
        const selectedIndex = this.data.selectedDeviceIndex;
        if (selectedIndex >= 0 && deviceList[selectedIndex]) {
          deviceList[selectedIndex].signalStrength = mockStatus.signalStrength;
          this.setData({
            deviceList: deviceList,
            'selectedDevice.signalStrength': mockStatus.signalStrength
          });
        }
      }
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
    }, 30 * 1000); // 10秒 (测试用)

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
    console.log('超过30秒未操作，停止自动刷新');
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
    this.bufferCommand('setPower', newPowerState);
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
    }, 500); // 1秒内的连续操作只发送最后一次
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

      // 如果蓝牙已连接，尝试通过蓝牙发送
      if (this.data.isBluetoothConnected && this.data.connectedDevice) {
        console.log('[Bluetooth] 尝试通过蓝牙发送指令:', finalData);
        this.sendBluetoothCommand(finalData);
      }
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

  // --- 蓝牙搜索与连接逻辑 ---

  startBluetoothDiscovery() {
    if (this.data.isSearchingBluetooth) return;

    this.setData({
      isSearchingBluetooth: true,
      bluetoothSearchTimer: 30,
      bluetoothDevices: []
    });

    // 开启蓝牙模块
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('蓝牙模块初始化成功');
        this.startSearch();
      },
      fail: (err) => {
        console.error('蓝牙初始化失败', err);
        wx.showToast({ title: '请开启手机蓝牙', icon: 'error' });
        this.setData({ isSearchingBluetooth: false });
      }
    });

    // 搜索倒计时
    this.searchCountdown = setInterval(() => {
      if (this.data.bluetoothSearchTimer > 0) {
        this.setData({ bluetoothSearchTimer: this.data.bluetoothSearchTimer - 1 });
      } else {
        this.stopSearch();
      }
    }, 1000);
  },



  startSearch() {
    function filterFunc(d) {
      if ((d.name || d.localName) && d.name !== '未知设备') {
        if (d.advertisServiceUUIDs && d.advertisServiceUUIDs.length > 0) {
          // 使用some或者for循环来正确返回true
          for (let i = 0; i < d.advertisServiceUUIDs.length; i++) {
            const uuid = d.advertisServiceUUIDs[i];
            console.log("uuid:", uuid.slice(0, 8));
            if (uuid.slice(0, 8) === "0000FFE0" || uuid.slice(0, 8) === "0000FFE7") {
              console.log("注册空调蓝牙设备");
              return true;
            }
          }
        }
      }
      return false;
    }
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: false,
      success: (res) => {
        console.log('开始搜索蓝牙设备');
        // 监听发现新设备
        wx.onBluetoothDeviceFound((res) => {
          const newDevices = res.devices.filter(filterFunc);
          if (newDevices.length > 0) {
            let list = this.data.bluetoothDevices;
            newDevices.forEach(device => {
              if (!list.find(d => d.deviceId === device.deviceId)) {
                console.log("添加设备")
                list.push(device);
              }
            });
            this.setData({ bluetoothDevices: list });
          }
        });
      },
      fail: (err) => {
        console.error('搜索蓝牙设备失败', err);
      }
    });
  },

  stopSearch() {
    if (this.searchCountdown) {
      clearInterval(this.searchCountdown);
      this.searchCountdown = null;
    }
    wx.stopBluetoothDevicesDiscovery();
    this.setData({ isSearchingBluetooth: false });
  },

  manualRefreshBluetooth() {
    this.stopSearch();
    this.startBluetoothDiscovery();
  },

  closeBluetoothModal() {
    this.stopSearch();
    this.setData({ showBluetoothModal: false });
  },

  connectToBluetooth(e) {
    const deviceId = e.currentTarget.dataset.id;
    const device = this.data.bluetoothDevices.find(d => d.deviceId === deviceId);

    wx.showLoading({ title: '正在连接...' });
    this.stopSearch();

    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        console.log('蓝牙连接成功', res);

        // 将蓝牙设备添加到设备列表
        const bluetoothDevice = {
          id: 'bt_' + deviceId,
          name: device.name || device.localName || '蓝牙设备',
          sn: device.name || device.localName || '蓝牙设备',
          imei: deviceId,
          deviceId: deviceId,
          activationDate: '--',
          warrantyDate: '--',
          image: '',
          status: 'active',
          online: true,
          connectionType: 'bluetooth', // 标记为蓝牙连接
          signalStrength: 5 // 蓝牙默认满信号
        };

        let deviceList = this.data.deviceList || [];
        // 检查是否已存在该蓝牙设备
        const existingIndex = deviceList.findIndex(d => d.deviceId === deviceId);
        if (existingIndex === -1) {
          deviceList.push(bluetoothDevice);
        } else {
          deviceList[existingIndex] = bluetoothDevice;
        }

        this.setData({
          connectedDevice: device,
          isBluetoothConnected: true,
          showBluetoothModal: false,
          deviceList: deviceList,
          selectedDeviceIndex: deviceList.length - 1,
          selectedDevice: bluetoothDevice
        });
        wx.showToast({ title: '连接成功', icon: 'success' });

        // 获取服务列表
        this.getBLEServices(deviceId);
      },
      fail: (err) => {
        console.error('蓝牙连接失败', err);
        wx.showToast({ title: '连接失败', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  getBLEServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        console.log('获取服务列表成功', res.services);
        if (res.services.length > 0) {
          const serviceId = res.services[1] ? res.services[1].uuid : res.services[0].uuid;
          this.setData({ serviceId });
          this.getBLECharacteristics(deviceId, serviceId);
        }
      }
    });
  },

  getBLECharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('获取特征值成功', res.characteristics);
        const writeChar = res.characteristics.find(c => c.properties.write);
        if (writeChar) {
          this.setData({ characteristicId: writeChar.uuid });
        }
      }
    });
  },


  // ==================== 蓝牙通信完整实现 ====================
// 基于绿色图协议（集控中心发送到显示屏）

/**
 * 构建并发送蓝牙控制指令
 * @param {Object} finalData - 包含action和value的指令对象
 */
sendBluetoothCommand(finalData) {
  if (!this.data.isBluetoothConnected) return;

  // 构建10字节数据包
  const buffer = new ArrayBuffer(10);
  const dataView = new DataView(buffer);
  const remoteState = this.data.remoteState;

  // 帧头固定 (字节0-2)
  dataView.setUint8(0, 0xAA);  // 引导码0
  dataView.setUint8(1, 0x39);  // 引导码1
  dataView.setUint8(2, 0x02);  // 固定为0x02

  // 初始化数据字节 (字节3-9)
  let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

  // 字节#3: 开关机标志位
  // bit7: 0=关机, 1=开机
  // bit6-4: 模式 (001=通风, 002=睡眠, 003=制冷, 004=强劲, 005=自动, 006=制热, 007=除湿)
  // bit3-0: 风速 (0=1档, 1=2档, 2=3档, 3=4档, >=4=5档)
  const modeMap = {
      'fan': 1,      // 通风模式
      'eco': 2,      // 睡眠模式
      'auto': 3,     // 制冷模式
      'strong': 4,   // 强劲模式
      'heat': 6      // 制热模式
  };

  if (remoteState.powerOn) {
      data[0] = 0x80; // bit7=1 开机

      // 设置模式 (bit6-4)
      const mode = modeMap[remoteState.mode] || 3;
      data[0] |= (mode << 4);

      // 设置风速 (bit3-0)
      const windSpeed = Math.max(0, Math.min(4, remoteState.windSpeed - 1));
      data[0] |= windSpeed;
  } else {
      data[0] = 0x00; // 关机
  }

  // 字节#4: 设置温度
  // 十进制5-40对应5-40摄氏度，数值<=5按照5摄氏度工作，数值>=40按照40摄氏度工作
  data[1] = Math.max(5, Math.min(40, remoteState.targetTemperature));

  // 字节#5: 欠压保护低字节 (备用，默认为0)
  data[2] = 0x00;

  // 字节#6: 欠压保护高字节 (备用，默认为0)
  data[3] = 0x00;

  // 字节#7: 压缩机功率限制 (备用，默认为0)
  data[4] = 0x00;

  // 字节#8: 定时
  // bit7: 0=不触发定时, 1=设置定时
  // bit3-0: 最短30分钟，最长8小时，十进制从0开始，步长为1，每30分钟+1
  // 最多15，则好从0000到1111
  if (remoteState.clock && this.data.timerMinutes) {
      const timerValue = Math.min(15, Math.floor(this.data.timerMinutes / 30));
      data[5] = 0x80 | timerValue; // bit7=1表示设置定时
  } else {
      data[5] = 0x00;
  }

  // 字节#9: 其他功能标志位
  // bit0: 上下摆风标志位 (0=关闭, 1=打开)
  // bit1: 左右摆风标志位 (0=关闭, 1=打开)
  // bit2: 照明标志位 (0=关闭, 1=打开)
  // bit3: 氛围灯 (0=关闭, 1=打开)
  // bit4: 负离子 (0=关闭, 1=打开)
  // 其他位备用，默认为0
  data[6] = 0x00;
  if (remoteState.swingUpDown) data[6] |= 0x01;      // bit0
  if (remoteState.swingLeftRight) data[6] |= 0x02;   // bit1
  if (remoteState.lightingOn) data[6] |= 0x04;       // bit2
  if (remoteState.lightSurround) data[6] |= 0x08;    // bit3 氛围灯
  if (remoteState.lightClean) data[6] |= 0x10;       // bit4 负离子

  // 字节#10: 校验 (所有字节异或)
  // 这里不设置，在后面统一计算

  // 将数据写入buffer (字节3-9)
  for (let i = 0; i < 7; i++) {
      dataView.setUint8(3 + i, data[i]);
  }

  // 计算校验位 (字节9)
  let checksum = 0;
  for (let i = 0; i < 9; i++) {
      checksum ^= dataView.getUint8(i);
  }
  dataView.setUint8(9, checksum);

  // 打印发送的数据包（用于调试）
  const bytes = [];
  for (let i = 0; i < 10; i++) {
      bytes.push('0x' + dataView.getUint8(i).toString(16).toUpperCase().padStart(2, '0'));
  }
  console.log('[蓝牙发送] 数据包:', bytes.join(' '));
  console.log('[蓝牙发送] 解析:', {
      开关: (data[0] & 0x80) ? '开机' : '关机',
      模式: ['', '通风', '睡眠', '制冷', '强劲', '自动', '制热', '除湿'][(data[0] >> 4) & 0x07] || '未知',
      风速: (data[0] & 0x0F) + 1 + '档',
      温度: data[1] + '°C',
      定时: (data[5] & 0x80) ? ((data[5] & 0x0F) * 30) + '分钟' : '未设置',
      上下摆风: (data[6] & 0x01) ? '开' : '关',
      左右摆风: (data[6] & 0x02) ? '开' : '关',
      照明: (data[6] & 0x04) ? '开' : '关',
      氛围灯: (data[6] & 0x08) ? '开' : '关',
      负离子: (data[6] & 0x10) ? '开' : '关'
  });

  // 发送蓝牙指令
  wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
          console.log('[蓝牙发送] 指令发送成功');
      },
      fail: (err) => {
          console.error('[蓝牙发送] 指令发送失败', err);
          if (err.errCode === 10006) {
              this.setData({ isBluetoothConnected: false });
              wx.showToast({ title: '蓝牙连接已断开', icon: 'none' });
          }
      }
  });
},

/**
* 解析蓝牙接收到的数据（基于橙色图协议 - 显示屏发送到集控中心）
* @param {ArrayBuffer} buffer - 接收到的数据包
*/
parseBluetoothData(buffer) {
  const dataView = new DataView(buffer);

  // 验证帧头
  if (dataView.getUint8(0) !== 0xAA || dataView.getUint8(1) !== 0xB4) {
      console.warn('[蓝牙接收] 无效的帧头');
      return null;
  }

  // 验证固定字节
  if (dataView.getUint8(2) !== 0x01) {
      console.warn('[蓝牙接收] 无效的固定字节');
      return null;
  }

  const parsedData = {};

  // 字节#3: 开关机标志位
  const byte3 = dataView.getUint8(3);
  parsedData.powerOn = (byte3 & 0x80) !== 0; // bit7

  // bit6-4: 模式
  const modeValue = (byte3 >> 4) & 0x07;
  const modeNames = ['', '通风', '睡眠', '制冷', '强劲', '自动', '制热', '除湿'];
  parsedData.modeName = modeNames[modeValue] || '未知';
  const modeKeys = ['', 'fan', 'eco', 'auto', 'strong', 'auto', 'heat', ''];
  parsedData.mode = modeKeys[modeValue] || 'auto';

  // bit3-0: 风速
  parsedData.windSpeed = (byte3 & 0x0F) + 1;

  // 字节#4: 当前设定温度
  parsedData.targetTemperature = dataView.getUint8(4);

  // 字节#5: 欠压保护低字节 (备用)
  // 字节#6: 欠压保护高字节 (备用)
  // 字节#7: 压缩机功率限制 (备用)

  // 字节#8: 定时
  const byte8 = dataView.getUint8(7);
  parsedData.timerEnabled = (byte8 & 0x80) !== 0;
  if (parsedData.timerEnabled) {
      parsedData.timerMinutes = (byte8 & 0x0F) * 30;
  }

  // 字节#9: 其他功能标志位
  const byte9 = dataView.getUint8(8);
  parsedData.swingUpDown = (byte9 & 0x01) !== 0;      // bit0
  parsedData.swingLeftRight = (byte9 & 0x02) !== 0;   // bit1
  parsedData.lightingOn = (byte9 & 0x04) !== 0;       // bit2
  parsedData.lightSurround = (byte9 & 0x08) !== 0;    // bit3 氛围灯
  parsedData.lightClean = (byte9 & 0x10) !== 0;       // bit4 负离子

  // 字节#10-11: 进风温度 (0-200对应-50到150度, 250表示传感器故障)
  const inletTemp = dataView.getUint8(9);
  parsedData.inletTemp = inletTemp === 250 ? '故障' : (inletTemp - 50);

  // 字节#11: 出风温度
  const outletTemp = dataView.getUint8(10);
  parsedData.outletTemp = outletTemp === 250 ? '故障' : (outletTemp - 50);

  // 字节#12: 电瓶电压低字节
  // 字节#13: 电瓶电压高字节
  // 电瓶电压低字节 单位0.1V
  const voltageLow = dataView.getUint8(11);
  const voltageHigh = dataView.getUint8(12);
  parsedData.voltage = (voltageHigh * 256 + voltageLow) * 0.1;

  // 字节#14: 故障代码1
  const fault1 = dataView.getUint8(13);
  parsedData.faults = [];
  const faultNames1 = [
      '无故障', '', '压缩机过载', '压缩机堵转保护',
      '控制器欠压保护', '控制器故障', '电子阀故障', '压缩机缺相',
      '压缩机温度保护', '压力保护', '电子阀故障'
  ];
  if (fault1 > 0 && fault1 < faultNames1.length) {
      parsedData.faults.push(faultNames1[fault1]);
  }

  // 字节#15: 故障代码2
  const fault2 = dataView.getUint8(14);
  const faultNames2 = ['无故障', '电瓶欠压'];
  if (fault2 > 0 && fault2 < faultNames2.length) {
      parsedData.faults.push(faultNames2[fault2]);
  }

  // 打印解析结果
  console.log('[蓝牙接收] 解析数据:', parsedData);

  // 更新界面状态
  this.setData({
      'remoteState.powerOn': parsedData.powerOn,
      'remoteState.mode': parsedData.mode,
      'remoteState.windSpeed': parsedData.windSpeed,
      'remoteState.targetTemperature': parsedData.targetTemperature,
      'remoteState.swingUpDown': parsedData.swingUpDown,
      'remoteState.swingLeftRight': parsedData.swingLeftRight,
      'remoteState.lightingOn': parsedData.lightingOn,
      'remoteState.lightSurround': parsedData.lightSurround,
      'remoteState.lightClean': parsedData.lightClean,
      'deviceStatus.inletTemp': parsedData.inletTemp,
      'deviceStatus.outletTemp': parsedData.outletTemp,
      'deviceStatus.voltage': parsedData.voltage.toFixed(1),
      'deviceStatus.faultCode': parsedData.faults.join(', ') || ''
  });

  return parsedData;
},

/**
* 启动蓝牙数据监听
*/
startBluetoothDataListener() {
  if (!this.data.isBluetoothConnected) return;

  wx.onBLECharacteristicValueChange((res) => {
      console.log('[蓝牙接收] 收到数据:', res);
      this.parseBluetoothData(res.value);
  });

  // 启用notify
  wx.notifyBLECharacteristicValueChange({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      state: true,
      success: () => {
          console.log('[蓝牙接收] 数据监听已启动');
      },
      fail: (err) => {
          console.error('[蓝牙接收] 启动监听失败', err);
      }
  });
},
sendBluetoothCommand(finalData) {
  if (!this.data.isBluetoothConnected) return;

  // 根据协议构建10字节的数据包
  // 格式: [帧头, 功能码, 指令类型, 数据1, 数据2, 数据3, 数据4, 数据5, 数据6, 数据7, 保留位]
  const buffer = new ArrayBuffer(10);
  const dataView = new DataView(buffer);

  // 帧头固定为 0xAA, 功能码 0x39, 指令类型 0x02 (发送指令)
  dataView.setUint8(0, 0xAA);
  dataView.setUint8(1, 0x39);
  dataView.setUint8(2, 0x02);

  // 初始化数据数组
  let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

  // 解析指令类型
  const action = finalData.action;
  const value = finalData.value;

  // 获取当前遥控器状态
  const remoteState = this.data.remoteState;

  // 模式映射: 1=通风(fan), 2=睡眠(eco), 3=制冷(auto), 4=强劲(strong)
  const modeMap = {
      'fan': 1,
      'eco': 2,
      'auto': 3,
      'strong': 4
  };

  switch (action) {
      case 'setOn':
          // 开机时，读取remoteState所有参数构建完整的控制指令
          // data[0]: bit7=开关机, bit6-4=模式, bit3-0=风速
          data[0] = 0x80; // bit7=1 开机

          // bit6-4: 模式标志位
          const modeValue = modeMap[remoteState.mode] || 3; // 默认制冷模式
          data[0] |= (modeValue << 4);

          // bit3-0: 风速标志位 (0=1档, 1=2档, 2=3档, 3=4档, >=4=5档)
          const windSpeed = Math.max(0, Math.min(4, remoteState.windSpeed - 1));
          data[0] |= windSpeed;

          // data[1]: 温度 (5-40对应5-40度)
          data[1] = Math.max(5, Math.min(40, remoteState.targetTemperature));

          // data[6]: bit0=上下摆风, bit1=左右摆风, bit2=照明
          data[6] = 0x00;
          if (remoteState.swingUpDown) data[6] |= 0x01;      // bit0
          if (remoteState.swingLeftRight) data[6] |= 0x02;   // bit1
          if (remoteState.lightingOn) data[6] |= 0x04;       // bit2
          break;

      case 'setOff':
          // 关机：data[0] bit7=0
          data[0] = 0x00;
          break;

      case 'setTemperature':
          // 修改温度时，保持其他状态不变
          data[0] = 0x80; // 开机状态

          // 保持当前模式
          const tempMode = modeMap[remoteState.mode] || 3;
          data[0] |= (tempMode << 4);

          // 保持当前风速
          const tempWindSpeed = Math.max(0, Math.min(4, remoteState.windSpeed - 1));
          data[0] |= tempWindSpeed;

          // 设置新温度
          data[1] = Math.max(5, Math.min(40, value));

          // 保持摆风和照明状态
          if (remoteState.swingUpDown) data[6] |= 0x01;
          if (remoteState.swingLeftRight) data[6] |= 0x02;
          if (remoteState.lightingOn) data[6] |= 0x04;
          break;

      case 'setMode':
          // 修改模式时，保持其他状态不变
          data[0] = 0x80; // 开机状态

          // 设置新模式
          const newModeValue = modeMap[value] || 3;
          data[0] |= (newModeValue << 4);

          // 保持当前风速
          const modeWindSpeed = Math.max(0, Math.min(4, remoteState.windSpeed - 1));
          data[0] |= modeWindSpeed;

          // 保持当前温度
          data[1] = Math.max(5, Math.min(40, remoteState.targetTemperature));

          // 保持摆风和照明状态
          if (remoteState.swingUpDown) data[6] |= 0x01;
          if (remoteState.swingLeftRight) data[6] |= 0x02;
          if (remoteState.lightingOn) data[6] |= 0x04;
          break;

      case 'setWindSpeed':
          // 修改风速时，保持其他状态不变
          data[0] = 0x80; // 开机状态

          // 保持当前模式
          const windMode = modeMap[remoteState.mode] || 3;
          data[0] |= (windMode << 4);

          // 设置新风速
          const newWindSpeed = Math.max(0, Math.min(4, value - 1));
          data[0] |= newWindSpeed;

          // 保持当前温度
          data[1] = Math.max(5, Math.min(40, remoteState.targetTemperature));

          // 保持摆风和照明状态
          if (remoteState.swingUpDown) data[6] |= 0x01;
          if (remoteState.swingLeftRight) data[6] |= 0x02;
          if (remoteState.lightingOn) data[6] |= 0x04;
          break;

      case 'setLighting':
          // 修改照明时，保持其他状态不变
          data[0] = 0x80; // 开机状态

          // 保持当前模式和风速
          const lightMode = modeMap[remoteState.mode] || 3;
          data[0] |= (lightMode << 4);
          const lightWindSpeed = Math.max(0, Math.min(4, remoteState.windSpeed - 1));
          data[0] |= lightWindSpeed;

          // 保持当前温度
          data[1] = Math.max(5, Math.min(40, remoteState.targetTemperature));

          // 设置照明和摆风状态
          if (remoteState.swingUpDown) data[6] |= 0x01;
          if (remoteState.swingLeftRight) data[6] |= 0x02;
          if (value) data[6] |= 0x04; // 设置照明状态
          break;

      case 'setSwingUpDown':
          // 修改上下摆风时，保持其他状态不变
          data[0] = 0x80; // 开机状态

          // 保持当前模式和风速
          const swingUDMode = modeMap[remoteState.mode] || 3;
          data[0] |= (swingUDMode << 4);
          const swingUDWindSpeed = Math.max(0, Math.min(4, remoteState.windSpeed - 1));
          data[0] |= swingUDWindSpeed;

          // 保持当前温度
          data[1] = Math.max(5, Math.min(40, remoteState.targetTemperature));

          // 设置摆风和照明状态
          if (value) data[6] |= 0x01; // 设置上下摆风
          if (remoteState.swingLeftRight) data[6] |= 0x02;
          if (remoteState.lightingOn) data[6] |= 0x04;
          break;

      case 'setSwingLeftRight':
          // 修改左右摆风时，保持其他状态不变
          data[0] = 0x80; // 开机状态

          // 保持当前模式和风速
          const swingLRMode = modeMap[remoteState.mode] || 3;
          data[0] |= (swingLRMode << 4);
          const swingLRWindSpeed = Math.max(0, Math.min(4, remoteState.windSpeed - 1));
          data[0] |= swingLRWindSpeed;

          // 保持当前温度
          data[1] = Math.max(5, Math.min(40, remoteState.targetTemperature));

          // 设置摆风和照明状态
          if (remoteState.swingUpDown) data[6] |= 0x01;
          if (value) data[6] |= 0x02; // 设置左右摆风
          if (remoteState.lightingOn) data[6] |= 0x04;
          break;

      default:
          console.warn('未知的蓝牙指令类型:', action);
          return;
  }

  // 设置数据字段 (索引 3-9, 对应data[0]-data[6])
  for (let i = 0; i < 7; i++) {
      dataView.setUint8(3 + i, data[i]);
  }

  // 计算校验位 (索引 9)
  // 校验位 = 所有字节的异或值
  let checksum = 0;
  for (let i = 0; i < 9; i++) {
      checksum ^= dataView.getUint8(i);
  }
  dataView.setUint8(9, checksum);

  // 打印发送的数据包（用于调试）
  const bytes = [];
  for (let i = 0; i < 10; i++) {
      bytes.push('0x' + dataView.getUint8(i).toString(16).toUpperCase().padStart(2, '0'));
  }
  console.log('[Bluetooth] 发送数据包:', bytes.join(' '));
  console.log('[Bluetooth] 解析: 开关=' + ((data[0] & 0x80) ? '开' : '关') +
      ', 模式=' + ((data[0] >> 4) & 0x07) +
      ', 风速=' + ((data[0] & 0x0F) + 1) + '档' +
      ', 温度=' + data[1] + '°C' +
      ', 上下摆风=' + ((data[6] & 0x01) ? '开' : '关') +
      ', 左右摆风=' + ((data[6] & 0x02) ? '开' : '关') +
      ', 照明=' + ((data[6] & 0x04) ? '开' : '关'));

  wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
          console.log('蓝牙指令发送成功');
      },
      fail: (err) => {
          console.error('蓝牙指令发送失败', err);
          if (err.errCode === 10006) {
              this.setData({ isBluetoothConnected: false });
              wx.showToast({ title: '蓝牙连接已断开', icon: 'none' });
          }
      }
  });
},


  sendBluetoothCommand(finalData) {
    if (!this.data.isBluetoothConnected) return;

    // 根据协议构建10字节的数据包
    // 格式: [帧头, 功能码, 数据1, 数据2, 数据3, 数据4, 数据5, 数据6, 数据7, 校验位]
    const buffer = new ArrayBuffer(10);
    const dataView = new DataView(buffer);

    // 帧头固定为 0xAA
    dataView.setUint8(0, 0xAA);
    dataView.setUint8(1, 0x39);
    dataView.setUint8(2, 0x02);

    // 根据不同的指令类型设置功能码和数据
    let functionCode = 0x00;
    let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

    // 解析指令类型
    const action = finalData.action;
    const value = finalData.value;
    //指令预处理

    switch (action) {
      case 'setOn':
        data[0] = 0x80; // bit7: 开关机
      case 'setOff':
        // 功能码 0x03: 开关机标志位
        data[0] = 0x00; // 关机
        break;
      case 'setTemperature':
        // 功能码 0x04: 设置温度
        functionCode = 0x04;
        // 温度范围: 5-40度，数值 = 实际温度 - 5
        const temp = Math.max(5, Math.min(40, value));
        data[0] = temp - 5;
        break;

      case 'setMode':
        // 功能码 0x03: 开关机标志位（包含模式）
        functionCode = 0x03;
        data[0] = 0x01; // 开机状态
        // bit6-4: 通风模式
        // 001: 通风模式, 002: 睡眠模式, 003: 制冷模式, 004: 强冷模式
        // 005: 自动模式(备用), 006: 制热模式(备用), 007: 除湿模式(备用)
        const modeMap = {
          'auto': 0x05,    // 自动模式
          'strong': 0x04,  // 强冷模式
          'eco': 0x02,     // 睡眠模式（节能）
          'heat': 0x06,    // 制热模式
          'off': 0x03      // 制冷模式（默认）
        };
        const modeValue = modeMap[value] || 0x03;
        data[0] |= (modeValue << 4);
        break;

      case 'setWindSpeed':
        // 功能码 0x03: 开关机标志位（包含风速）
        functionCode = 0x03;
        data[0] = 0x01; // 开机状态
        // bit3-0: 风速档位 (0-4对应1-5档)
        const windSpeed = Math.max(0, Math.min(4, value - 1));
        data[0] |= windSpeed;
        break;

      case 'setLighting':
        // 功能码 0x05: 关灯标志位
        functionCode = 0x05;
        data[0] = value ? 0x00 : 0x01; // 0: 开灯, 1: 关灯
        break;

      case 'setSwingUpDown':
        // 功能码 0x06: 左右摆风标志位
        functionCode = 0x06;
        data[0] = value ? 0x01 : 0x00;
        break;

      case 'setSwingLeftRight':
        // 功能码 0x07: 摆风标志位
        functionCode = 0x07;
        data[0] = value ? 0x01 : 0x00;
        break;

      case 'setTimer':
        // 功能码 0x09: 其他功能标志位
        functionCode = 0x09;
        // bit0: 上下摆风标志位, bit1: 左右摆风标志位, bit2: 定时标志位
        data[0] = 0x04; // bit2 = 1 表示定时
        data[1] = value || 0x00; // 定时时长
        break;

      default:
        console.warn('未知的蓝牙指令类型:', action);
        return;
    }

    // 设置功能码
    dataView.setUint8(1, functionCode);

    // 设置数据字段 (索引 2-8)
    for (let i = 0; i < 7; i++) {
      dataView.setUint8(2 + i, data[i]);
    }

    // 计算校验位 (索引 9)
    // 校验位 = 所有字节的异或值
    let checksum = 0;
    for (let i = 0; i < 9; i++) {
      checksum ^= dataView.getUint8(i);
    }
    dataView.setUint8(9, checksum);

    // 打印发送的数据包（用于调试）
    const bytes = [];
    for (let i = 0; i < 10; i++) {
      bytes.push('0x' + dataView.getUint8(i).toString(16).toUpperCase().padStart(2, '0'));
    }
    console.log('[Bluetooth] 发送数据包:', bytes.join(' '));

    wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
        console.log('蓝牙指令发送成功');
      },
      fail: (err) => {
        console.error('蓝牙指令发送失败', err);
        if (err.errCode === 10006) {
          this.setData({ isBluetoothConnected: false });
          wx.showToast({ title: '蓝牙连接已断开', icon: 'none' });
        }
      }
    });
  },

});
