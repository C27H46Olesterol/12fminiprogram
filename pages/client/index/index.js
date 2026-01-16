const app = getApp();
var timer = require("../../../utils/wxTimer")
const deviceApi = require("../../../utils/deviceApi");
const { FAULT_CODES } = require("../../../utils/faultCodes");

let overTimeCount = 0;
Page({
  data: {
    userInfo: '',
    hasUserInfo: '',
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
    deviceList: [],
    selectedDeviceIndex: -1,
    selectedDevice: null,
    deviceStatus: {
      ps: 0,         // 开关状态 0:关, 1:开
      temp: 0,     // 设定温度 50-400 (对应5-40度)
      fm: 2,         // 风扇模式 0:通风, 1:睡眠, 2:制冷, 3:强劲, (4:自动, 5:制热, 6:除湿)
      fs: 2,         // 风扇转速 1-5档
      fl: 0,         // 氛围灯 0:关, 1:开
      light: 0,      // 照明灯 0:关, 1:开
      lock: 0,       // 锁定 0:关, 1:开
      sxbf: 0,       // 上下摆风 0:关, 1:开
      zybf: 0,       // 左右摆风 0:关, 1:开
      fu: 0,         // 负离子 0:关, 1:开
      timer: 0,      // 定时 0-480 (对应0-8小时)
      bv: 0,         // 电瓶电压
      it: 0,         // 进风温度
      ot: 0,         // 出风温度
      err: 0,        // 故障代码
      online: false,
      signalStrength: 0,
      clock: false,   // 内部标记是否有定时
      timerDisplay: '00:00'
    },
    offlineDeviceStatus: {
      ps: 0,         // 开关状态 0:关, 1:开
      temp: 0,     // 设定温度 50-400 (对应5-40度)
      fm: 8,         // 风扇模式 0:通风, 1:睡眠, 2:制冷, 3:强劲, (4:自动, 5:制热, 6:除湿)
      fs: 0,         // 风扇转速 1-5档
      fl: 0,         // 氛围灯 0:关, 1:开
      light: 0,      // 照明灯 0:关, 1:开
      lock: 0,       // 锁定 0:关, 1:开
      sxbf: 0,       // 上下摆风 0:关, 1:开
      zybf: 0,       // 左右摆风 0:关, 1:开
      fu: 0,         // 负离子 0:关, 1:开
      timer: 0,      // 定时 0-480 (对应0-8小时)
      bv: 0,         // 电瓶电压
      it: 0,         // 进风温度
      ot: 0,         // 出风温度
      err: 0,        // 故障代码
      online: false,
      signalStrength: 0,
      clock: false   // 内部标记是否有定时
    },

    wxTimerList: [],
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
    showAddDeviceDropdown: false, // 添加设备下拉菜单显示状态
    showModeDropdown: false, // 模式选择下拉菜单
    showSwingDropdown: false, // 摆风选择下拉菜单
    showFunctionDropdown: false, // 功能选择下拉菜单


    //错误信息
    errMsg: '',

    // 故障警告
    showFaultAlert: false, // 是否显示故障警告
    currentFaultInfo: null, // 当前故障信息

    isQuickSearch: false, // 快速搜索标志位
  },
  onLoad() {
    //关闭加载弹窗
    console.log('加载页面onLoad')
    setTimeout(() => {
      wx.hideLoading()
    }, 1500)

    //停止下拉刷新
    wx.stopPullDownRefresh()
    // 启动定时任务
    console.log('加载页面onLoad完毕')
  },

  //下拉刷新事件
  onPullDownRefresh: function () {
    this.onShow();
  },

  onShow() {
    this.isPageActive = true; // 标记页面为活跃状态
    this.UserInfoStorageCheck() //检查用户登陆状态
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }

    console.log("显示client/index")
    this.loadUserData().then(() => {
      // 只有在页面仍然活跃时才启动定时器
      if (this.isPageActive) {
        this.resetInactivityTimer();
      }
    }); // 加载用户专属数据

    console.log("client/index加载完毕")
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)

    wx.stopPullDownRefresh()
  },

  /**
   * 入口提示动画：短时间展开所有菜单后收回
   */
  triggerEntranceAnimation() {
    // 延迟一点点触发，等待页面渲染稳定
    setTimeout(() => {
      this.setData({
        showModeDropdown: true,
        showSwingDropdown: true,
        showFunctionDropdown: true,
        showAddDeviceDropdown: true
      });

      // 1.5秒后自动收回
      setTimeout(() => {
        this.setData({
          showModeDropdown: false,
          showSwingDropdown: false,
          showFunctionDropdown: false,
          showAddDeviceDropdown: false
        });
      }, 1500);
    }, 500);
  },

  onHide() {
    this.isPageActive = false; // 标记页面为非活跃状态
    this.clearAllTimers();
    console.log('onHide()事件触发，已清除所有定时器')
  },

  onUnload() {
    this.isPageActive = false; // 标记页面为非活跃状态
    this.clearAllTimers();
    console.log('onUnload()事件触发，已清除所有定时器和连接')
  },

  //缓存登陆信息检查
  UserInfoStorageCheck() {
    console.log('加载页面')
    if (app.globalData.hasUserInfo && app.globalData.userInfo) {
      this.setData({
        hasUserInfo: app.globalData.hasUserInfo,
        userInfo: app.globalData.userInfo
      });
      console.log("缓存登陆信息校验1：hasUserInfo：", this.data.hasUserInfo)
      console.log("缓存登陆信息校验2：usserInfo", this.data.userInfo)
    } else {
      console.log('用户未登录')
    }
  },

  // 跳转登录
  onGoLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  // 加载用户专属数据
  async loadUserData() {
    const userInfo = this.data.userInfo
    const hasUserInfo = this.data.hasUserInfo
    if (userInfo && hasUserInfo) {
      console.log('加载已激活产品')
      // 1. 加载云端已激活的4G/API产品
      const myProductsList = await this.formatActivateProduct()

      // 2. 加载本地保存的蓝牙设备
      const savedBTDevices = wx.getStorageSync('savedBTDevices') || [];

      // 3. 合并列表 (4G设备在前，蓝牙设备在后)
      const combinedList = [...myProductsList, ...savedBTDevices];

      this.setData({
        myProducts: myProductsList,
        deviceList: combinedList
      })

      wx.setStorageSync('myProductsList', myProductsList)

      // 更新设备列表 (用于下拉菜单和遥控)
      if (combinedList.length > 0) {
        const savedsn = wx.getStorageSync('selectedDeviceImei');
        console.log('保存的设备选中信息', savedsn)
        let selectedIndex = -1;
        if (savedsn) {
          selectedIndex = combinedList.findIndex(d => d.sn === savedsn || d.imei === savedsn);
        }

        // 如果没找到之前的设备，默认选第一个
        if (selectedIndex === -1) {
          selectedIndex = 0;
          wx.setStorageSync('selectedDeviceImei', combinedList[0].sn || combinedList[0].imei);
        }

        this.setData({
          selectedDeviceIndex: selectedIndex,
          selectedDevice: combinedList[selectedIndex],
        });

        // 加载设备状态
        await this.loadDeviceStatus();
      } else {
        this.setData({
          deviceList: [],
          selectedDeviceIndex: -1,
          selectedDevice: null,
          deviceStatus: this.data.offlineDeviceStatus
        });
        wx.removeStorageSync('selectedDeviceImei');
      }
    }
  },

  //加载用户已激活产品
  async formatActivateProduct() {
    const userInfo = this.data.userInfo;
    const hasUserInfo = this.data.hasUserInfo;
    if (hasUserInfo || userInfo) {
      try {
        // const result = await app.apiRequest('/pro/banding/my', 'GET');
        const result = await deviceApi.getUserActiveDevice();
        if (!this.handleApiResult(result)) return [];

        // 检查调用是否成功
        if (result && result.data) {
          const res = result.data;
          return res.map((item, index) => ({
            id: index + 1,
            name: '驻车空调' + item.sn.slice(18),
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
    }

  },

  // 头像加载错误处理
  onAvatarError(e) {
    console.log('头像加载失败，使用默认头像', e);
    this.setData({
      'userInfo.avatarUrl': ''
    });
  },

  //时间数据格式化
  formatTime(time) {
    if (!time) return '';
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // 切换下拉菜单显示状态
  toggleDropdown() {

    this.setData({
      showDropdown: !this.data.showDropdown,
      showDeviceModal: false, // 互斥显示
      showAddDeviceDropdown: false,
      showModeDropdown: false,
      showSwingDropdown: false,
      showFunctionDropdown: false
    });
  },

  // 切换添加设备下拉菜单
  toggleAddDeviceDropdown() {

    this.setData({
      showAddDeviceDropdown: !this.data.showAddDeviceDropdown,
      showDropdown: false,
      showDeviceModal: false,
      showModeDropdown: false,
      showSwingDropdown: false,
      showFunctionDropdown: false
    });
  },

  // 关闭所有下拉菜单 (点击外部时触发)
  closeAllDropdowns() {
    // 
    // 检查是否有任意菜单开启
    if (this.data.showDropdown || this.data.showDeviceModal || this.data.showAddDeviceDropdown ||
      this.data.showModeDropdown || this.data.showSwingDropdown || this.data.showFunctionDropdown) {
      this.setData({
        showDropdown: false,
        showDeviceModal: false,
        showAddDeviceDropdown: false,
        showModeDropdown: false,
        showSwingDropdown: false,
        showFunctionDropdown: false
      });
    }
  },

  // 空操作，仅用于阻止冒泡
  noOp() { },

  //产品激活事件
  onActivateProduct() {
    this.setData({
      showAddDeviceDropdown: false
    });

    if (!wx.getStorageSync('hasUserInfo')) {
      // 未登录，存储目标页面后跳转登录
      wx.showModal({
        title: '未登录',
        content: '4G远程遥控需要先登陆后使用 \r\n点击确定跳转登陆界面 \r\n点击取消可以尝试使用蓝牙连接',
        success(res) {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/login/login' });
          } else if (res.cancel) {
          }
        }
      })
      return;
    }
    console.log("设备激活")
    wx.navigateTo({ url: '/pages/client/activate/activate' });
  },

  //开启蓝牙搜索
  blueToothfunc() {
    wx.vibrateShort({ type: 'light' });
    this.setData({
      showDropdown: false,
      showAddDeviceDropdown: false,
      showBluetoothModal: true,
      bluetoothDevices: []
    });
    this.startBluetoothDiscovery();
  },

  // --- Remote Control Methods (Moved from remote.js) ---

  // 切换设备选择弹窗
  toggleDeviceModal() {
    // 
    this.setData({
      showDeviceModal: !this.data.showDeviceModal,
      showDropdown: false, // 互斥显示
      showAddDeviceDropdown: false,
      showModeDropdown: false,
      showSwingDropdown: false,
      showFunctionDropdown: false
    });
  },

  // 选择设备
  onSelectDevice(e) {
    //切换设备前中止轮询
    this.stopAutoRefresh();
    //清除上一个设备的遗留状态
    this.setData({
      deviceStatus: this.data.offlineDeviceStatus
    })

    const index = e.currentTarget.dataset.index;
    const device = this.data.deviceList[index];

    // 如果选择的是蓝牙设备，直接触发连接逻辑
    if (device.connectionType === 'bluetooth') {
      this._executeBTConnect(device);
      return;
    }

    this.setData({
      selectedDeviceIndex: index,
      selectedDevice: device,
      showDeviceModal: false
    });
    wx.setStorageSync('selectedDeviceImei', device.sn || device.imei);
    wx.showToast({
      title: `已切换至 ${device.sn || '新设备'}`,
      icon: 'none'
    });

    // 切换设备后对新设备继续轮询
    this.resetInactivityTimer();
  },

  // 取消配对/删除设备
  onUnpairDevice(e) {
    const index = e.currentTarget.dataset.index;
    const device = e.currentTarget.dataset.item;

    wx.showModal({
      title: '提示',
      content: `确定要${device.connectionType === 'bluetooth' ? '断开并移除' : '移除'}设备 ${device.name || device.sn} 吗？`,
      success: async (res) => {
        if (res.confirm) {
          if (device.connectionType === 'bluetooth') {
            // 1. 尝试关闭蓝牙连接
            wx.closeBLEConnection({
              deviceId: device.deviceId,
              success: () => console.log("断开蓝牙连接成功"),
              fail: (err) => console.error("断开蓝牙连接失败", err)
            });

            // 清空本地蓝牙连接状态并关闭监听
            if (this.data.isBluetoothConnected && this.data.connectedDevice && this.data.connectedDevice.deviceId === device.deviceId) {
              this.stopBluetoothDataListener();
              this.setData({
                isBluetoothConnected: false,
                connectedDevice: null,
                serviceId: '',
                characteristicId: '',
                bluetoothDevice: ''
              });

              // 同步清除全局状态
              app.globalData.isBluetoothConnected = false;
              app.globalData.bleDeviceId = '';
              app.globalData.bleServiceId = '';
              app.globalData.bleWriteCharId = '';
            }

            // 2. 从本地存储中移除该蓝牙设备
            let savedBTDevices = wx.getStorageSync('savedBTDevices') || [];
            savedBTDevices = savedBTDevices.filter(d => d.deviceId !== device.deviceId);
            wx.setStorageSync('savedBTDevices', savedBTDevices);

            // 3. 从列表中移除
            this.removeDeviceFromList(index);
            wx.showToast({ title: '已移除蓝牙设备', icon: 'none' });

            this.setData({
              deviceStatus: {
                ...this.data.offlineDeviceStatus,
              }
            })
          } else {
            // 4G设备，尝试调用解绑接口
            try {
              const res = await deviceApi.unbindDevice(device.sn)
              if (!this.handleApiResult(res)) return;
              if (res && res.code == 200) {
                this.removeDeviceFromList(index);
                wx.showToast({ title: '解绑成功', icon: 'success' });
              } else {
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
              this.removeDeviceFromList(index);
            }
          }
        }
      }
    });

    this.onShow();
  },

  // 移除设备
  removeDeviceFromList(index) {
    let deviceList = this.data.deviceList;
    if (!deviceList || deviceList.length <= index) return;

    const removedDevice = deviceList[index];
    deviceList.splice(index, 1);

    // 如果删除的设备是蓝牙设备，执行必要的清理
    if (removedDevice && removedDevice.connectionType === 'bluetooth') {
      console.log('移除蓝牙设备:', removedDevice.name);
    }

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
          ps: 0, temp: 250, fs: 1, fm: 5, fl: 0, light: 0, lock: 0,
          sxbf: 0, zybf: 0, fu: 0, timer: 0, bv: 0, it: 0, ot: 0, err: 0,
          online: false, signalStrength: 0, clock: false
        }
      });
    } else if (selectedDeviceIndex !== -1) {
      // 重新加载设备列表
      this.loadUserData();
    }
  },

  //定时
  async timerTest() {
    wx.vibrateShort({ type: 'light' });

    // Check if device is powered on
    if (!this.checkPower()) {
      this.setData({
        'deviceStatus.clock': false
      })
      return
    };

    // If timer is already running (clock is true and timer > 0)
    if (this.data.deviceStatus.clock && this.data.deviceStatus.timer > 0) {
      wx.showModal({
        title: '取消定时',
        content: `当前定时剩余 ${this.formatTimer(this.data.deviceStatus.timer)}，确定要取消吗？`,
        success: (res) => {
          if (res.confirm) {
            this.confirmTimer(0); // Cancel timer by setting to 0
          }
        }
      });
      return;
    }

    // Open timer setting modal
    this.setData({
      showTimerModal: true,
      timerMinutes: this.data.deviceStatus.timer > 0 ? this.data.deviceStatus.timer : 30, // Default to current or 30
      formattedTimer: this.formatTimer(this.data.deviceStatus.timer > 0 ? this.data.deviceStatus.timer : 30)
    });
  },

  // 增减定时（步长 30 分钟），限制在 30 - 480
  changeTimer(e) {
    wx.vibrateShort({ type: 'light' });
    const delta = parseInt(e.currentTarget.dataset.delta, 10) || 0;
    let m = this.data.timerMinutes + delta;
    if (m < 30) m = 30; // Minimum 30 mins for setting
    if (m > 480) m = 480;

    this.setData({
      timerMinutes: m,
      formattedTimer: this.formatTimer(m)
    });

  },

  closeTimerModal() {

    this.setData({ showTimerModal: false });
  },

  async confirmTimer(minutesOverride) {

    // Use override if provided (e.g., 0 for cancel), otherwise use selected minutes
    const minutes = (typeof minutesOverride === 'number') ? minutesOverride : this.data.timerMinutes;

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

    // 初始化计时器 (仅当设定时间大于0时)
    if (minutes > 0) {
      // NOTE: Since the device handles the timer countdown, we might not need a local wxTimer for accurate countdown unless we want to simulate it locally. 
      // Relying on device status updates (via auto-refresh) is safer to keep in sync.
      // However, keeping existing logic for now if user wants local countdown feel.

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
            'deviceStatus.clock': false,
            'deviceStatus.timer': 0,
            'deviceStatus.timerDisplay': '00:00'
          });
          this.timerInstance = null;
        }
      });

      timerInstance.start(this);
      this.timerInstance = timerInstance;
    } else {
      this.timerInstance = null;
    }

    this.setData({
      showTimerModal: false,
      'deviceStatus.clock': minutes > 0,
      'deviceStatus.timer': minutes,
      'deviceStatus.timerDisplay': this._formatTimerDisplay(minutes)
    });
    this.bufferCommand('setTimer', minutes);

    const toastTitle = minutes > 0 ? `已设置定时 ${this.formatTimer(minutes)}` : '定时已取消';
    wx.showToast({ title: toastTitle, icon: 'none' });
  },

  formatTimer(mins) {
    if (mins <= 0) return '0 分钟';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} 分钟`;
    if (m === 0) return `${h} 小时`;
    return `${h} 小时 ${m} 分钟`;
  },

  // 格式化为 小时:分钟 格式
  _formatTimerDisplay(mins) {
    if (!mins || mins <= 0) return '00:00';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  // 返回基础小时数（1 - 8 小时）字符串
  formatBaseHours(mins) {
    let h = Math.ceil((mins || 0) / 60);
    if (h < 1) h = 1;
    if (h > 8) h = 8;
    return `${h} 小时`;
  },

  // 加载设备状态返回处理
  async loadDeviceStatus(force = false) {

    try {
      const device = this.data.selectedDevice;
      console.log('检查选中设备状态：', device)
      if (!device) {
        console.log('设备列表无设备')
        this.clearAllTimers();
        return;
      }
      if (device.connectionType === 'bluetooth') {
        console.log('连接蓝牙设备：', device)
        if (this.data.isBluetoothConnected) {
          // this.getDeviceStatusByBluetooth();
          this.clearAllTimers();
        } else {
          console.log('蓝牙未连接，跳过状态查询')
        }
        return
      } else {
        const sn = device.sn;
        const res = await deviceApi.getDevicePropertyDetail(sn);
        if (!this.handleApiResult(res)) return;
        if (res.code === 200) {
          overTimeCount = 0;
          const props = res.data.properties;
          const signal = res.data.csq;
          //如果是强制通过指令后更新，或者过了不更新期，则同步远程状态
          if (force || !this.lastCommandTime || Date.now() - this.lastCommandTime > 2000) {
            if (!props) {
              return
            }
            this.setData({
              deviceStatus: {
                ...this.data.deviceStatus,
                ...props,
                online: true,
                signalStrength: signal || 0,
                clock: props.timer > 0,
                timerDisplay: this._formatTimerDisplay(props.timer !== undefined ? props.timer : this.data.deviceStatus.timer)
              },
              deviceOnline: true,
              isQuickSearch: true
            });
          }
          console.log("本地保存设备状态:", this.data.deviceStatus)
        }
        else if (res.code === 500) {
          if (res.msg === '获取属性失败:设备不在线') {
            wx.showToast({
              title: '设备不在线',
              icon: 'error'
            })
            this.setData({
              deviceStatus: this.data.offlineDeviceStatus
            })
            this.stopAutoRefresh();
            this.setData({
              showRefreshNotify: true
            })
          }
          else if (res.msg && res.msg.includes('设备响应超时')) {
            // overTimeCount++;
            // console.log('响应超时计数:', overTimeCount);
            wx.showLoading({
              title: '设备响应超时',
              mask: 'true'
            });
          }

        }
      }
      console.log('加载当前选中设备：', device)
    } catch (error) {
      console.error('加载设备状态失败:', error);
    }
    this.checkFaultStatus(this.data.deviceStatus);
  },

  // --- 自动刷新与不活跃计时逻辑 ---

  //页面刷新条件检查
  checkInfoReturn() {
    const userInfo = this.data.userInfo
    const hasUserInfo = this.data.hasUserInfo
    const deviceOnline = this.data.deviceStatus.online;
    const selectedDevice = this.data.selectedDevice

    const checkInfo = {
      userInfo: userInfo,
      hasUserInfo: hasUserInfo,
      deviceOnline: deviceOnline,
      selectedDevice: selectedDevice
    }
    console.log('自动刷新条件检查checkInfo:', checkInfo);
    if (userInfo && hasUserInfo && selectedDevice && deviceOnline) {
      return true;
    } else {
      return false;
    }
  },

  // 启动/重置不活跃计时器
  async resetInactivityTimer() {
    // 如果页面不活跃，直接返回，不启动任何定时器
    if (!this.isPageActive) return;


    if (this.checkInfoReturn()) {
      this.setData({ showRefreshNotify: false });

      // 清除旧的不活跃计时器
      if (this.inactivityTimeoutId) {
        clearTimeout(this.inactivityTimeoutId);
      }

      // 启动新的不活跃计时器 (5分钟无操作则停止自动刷新)
      this.inactivityTimeoutId = setTimeout(() => {
        this.autoStopRefresh();
      }, 30 * 1000);

      // 如果刷新定时器没启动，则启动它
      if (!this.refreshIntervalId) {
        console.log('[Timer] 启动3秒自动轮询');
        this.startAutoRefresh();
      }
    } else {
      console.log('[Timer] 未满足启动条件:');
    }
  },

  // 开启自动刷新 (每30秒)
  startAutoRefresh() {
    if (this.refreshIntervalId) return;

    console.log('开启自动刷新设备状态 当前每3s刷新一次');
    this.refreshIntervalId = setInterval(() => {
      this.loadDeviceStatus();
    }, 3 * 1000); // 3秒刷新一次
  },

  //发出命令 主动中断自动刷新
  stopAutoRefresh() {
    console.log('等待指令响应，停止自动刷新');
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  //固定时间停止刷新并弹出提示
  autoStopRefresh() {
    console.log('停止自动刷新，等待手动');
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
    // 清除后台蓝牙查询定时器
    if (this.backgroundBTInterval) {
      clearInterval(this.backgroundBTInterval);
      this.backgroundBTInterval = null;
    }
    // 清除恢复刷新的延时器
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  },

  // 开关机
  async togglePower() {
    wx.vibrateShort({ type: 'light' });

    const device = this.data.selectedDevice;
    const deviceStatus = this.data.deviceStatus;

    if (!device) {
      wx.showToast({
        title: '请先选择设备',
        icon: 'error'
      })
      return;
    }
    //设备在线状态判断
    if (!deviceStatus.online) {
      wx.showToast({
        title: '设备不在线！',
        icon: 'error'
      })
      return;
    }

    if (deviceStatus.ps === 1) {
      // 如果开机状态，发送关机指令
      this.setData({
        'deviceStatus.ps': 0
      });
      wx.showToast({ title: '正在关机...', icon: 'loading', duration: 1 * 1000 });
      this.bufferCommand('setPower', 0)
    } else {
      // 如果已关机发送开机指令：按关机时的状态开机
      this.setData({
        'deviceStatus.ps': 1
      });
      wx.showToast({ title: '正在开机...', icon: 'loading', duration: 1 * 1000 });
      this.bufferCommand('setPower', 1)
    }
  },

  // 增加风速
  increaseWindSpeed(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    else wx.vibrateShort({ type: 'light' });

    let speed = this.data.deviceStatus.fs || 1;
    if (speed < 5) {
      const newSpeed = speed + 1;
      this.setData({
        'deviceStatus.fs': newSpeed
      });
      if (!isLongPress) {
        wx.showToast({
          title: '风速' + newSpeed + '档',
          icon: 'none'
        })
      }
      this.bufferCommand('setWindSpeed', newSpeed);
    } else {
      if (!isLongPress) {
        this.setData({
          'deviceStatus.fs': 5
        });
        this.bufferCommand('setWindSpeed', 5);
        wx.showToast({ title: '已是最大风速', icon: 'none' });
      }
    }
  },

  // 减少风速
  decreaseWindSpeed(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    else wx.vibrateShort({ type: 'light' });

    let speed = this.data.deviceStatus.fs || 1;
    if (speed > 1) {
      const newSpeed = speed - 1;
      this.setData({
        'deviceStatus.fs': newSpeed
      });
      if (!isLongPress) {
        wx.showToast({
          title: '风速' + newSpeed + '档',
          icon: 'none'
        })
      }
      this.bufferCommand('setWindSpeed', newSpeed);
    } else {
      if (!isLongPress) {
        this.setData({
          'deviceStatus.fs': 1
        });
        this.bufferCommand('setWindSpeed', 1);
        wx.showToast({ title: '已是最小风速', icon: 'none' });
      }
    }
  },

  // 增加温度
  increaseTemperature(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    else wx.vibrateShort({ type: 'light' });

    let temp = Math.floor((this.data.deviceStatus.temp || 250) / 10);
    if (temp < 32) {
      const newTemp = temp + 1;
      this.setData({
        'deviceStatus.temp': newTemp * 10
      });
      if (!isLongPress) {
        wx.showToast({
          title: '设置' + newTemp + '°C',
          icon: 'none'
        })
      }
      this.bufferCommand('setTemperature', newTemp);
    } else {
      if (!isLongPress) {
        this.setData({
          'deviceStatus.temp': 320
        });
        this.bufferCommand('setTemperature', 32);
        wx.showToast({ title: '已是最高温度', icon: 'none' });
      }
    }
  },

  // 减少温度
  decreaseTemperature(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    else wx.vibrateShort({ type: 'light' });

    let temp = Math.floor((this.data.deviceStatus.temp || 250) / 10);
    if (temp > 5) {
      const newTemp = temp - 1;
      this.setData({
        'deviceStatus.temp': newTemp * 10
      });
      if (!isLongPress) {
        wx.showToast({
          title: '设置' + newTemp + '°C',
          icon: 'none'
        })
      }
      this.bufferCommand('setTemperature', newTemp);
    } else {
      if (!isLongPress) {
        this.setData({
          'deviceStatus.temp': 50
        });
        this.bufferCommand('setTemperature', 5);
        wx.showToast({ title: '已是最低温度', icon: 'none' });
      }
    }
  },

  // --- 长按控制逻辑 ---
  onControlStart(e) {
    const action = e.currentTarget.dataset.action;
    if (!this[action]) return;

    // 停止自动刷新，防止长按时数据抖动
    this.stopAutoRefresh();
    this.isLongPressing = true;

    // 立即执行一次
    this[action](false);

    // 判定长按
    this._longPressDelay = setTimeout(() => {
      this._longPressTimer = setInterval(() => {
        this[action](true);
      }, 150); // 匀速变化频率
    }, 500);
  },

  onControlEnd() {
    this.isLongPressing = false;
    if (this._longPressDelay) {
      clearTimeout(this._longPressDelay);
      this._longPressDelay = null;
    }
    if (this._longPressTimer) {
      clearInterval(this._longPressTimer);
      this._longPressTimer = null;
    }

    // 延迟恢复自动刷新，给设备留出状态更新的时间
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      // // this.resetInactivityTimer();
    }, 2000);
  },

  // --- 新增功能键整合逻辑 ---

  // 1. 模式键逻辑
  toggleModeDropdown() {
    this.setData({
      showModeDropdown: !this.data.showModeDropdown,
      showSwingDropdown: false,
      showFunctionDropdown: false,
      showAddDeviceDropdown: false,
      showDeviceModal: false
    });
  },

  //切换模式
  selectMode(e) {
    let mode = e.currentTarget.dataset.mode;

    // Ensure mode is a number
    mode = parseInt(mode, 10);

    if (isNaN(mode)) {
      console.warn("Invalid mode selected:", e.currentTarget.dataset.mode);
      return;
    }

    this.switchMode(mode);
    console.log("当前mode", mode)
    this.setData({ showModeDropdown: false });
  },

  switchMode(mode) {

    wx.vibrateShort({ type: 'light' });
    if (!this.checkPower()) return;

    // let windSpeed = this.data.deviceStatus.fs;
    // if (mode === 4) windSpeed = 5;
    // if (mode === 2) windSpeed = 1;
    // if (mode === 5 || mode === 3) windSpeed = 3;

    this.setData({
      'deviceStatus.fm': mode,
      // 'deviceStatus.fs': windSpeed
    });
    console.log('当前模式：', this.data.deviceStatus.fm)

    let modeName = { 0: '通风', 1: '睡眠', 2: '制冷', 3: '强劲', 4: '自动', 5: '制热' }[mode] || '自动';
    this.showControlToast(`${modeName}模式`);
    this.bufferCommand('setMode', mode);
  },

  // 2. 摆风键逻辑
  toggleSwingDropdown() {
    this.setData({
      showSwingDropdown: !this.data.showSwingDropdown,
      showModeDropdown: false,
      showFunctionDropdown: false,
      showAddDeviceDropdown: false,
      showDeviceModal: false
    });
  },

  selectSwing(e) {
    const type = e.currentTarget.dataset.type; // 'off', 'ud', 'lr', 'both'

    if (type === 'ud') {
      const isSXBFOn = this.data.deviceStatus.sxbf === 1;
      this.setSXBF(isSXBFOn ? 0 : 1);
    }
    else if (type === 'lr') {
      const isZYBFOn = this.data.deviceStatus.zybf === 1;
      this.setZYBF(isZYBFOn ? 0 : 1);
    }

    // this.setData({ showSwingDropdown: false });
  },

  setZYBF(state) {
    wx.vibrateShort({ type: 'light' });
    if (!this.checkPower()) return;
    console.log('左右摆风：', this.data.deviceStatus.zybf);
    const lr = (state === 1 || state === 3);
    this.setData({
      'deviceStatus.zybf': lr ? 1 : 0
    })
    let name = lr ? '左右摆风开启' : '左右摆风关闭';
    this.showControlToast(name);
    this.bufferCommand('setSwingLeftRight', lr);
  },

  setSXBF(state) {
    wx.vibrateShort({ type: 'light' });
    if (!this.checkPower()) return;
    console.log('上下摆风：', this.data.deviceStatus.sxbf);
    const ud = (state === 1 || state === 3);
    this.setData({
      'deviceStatus.sxbf': ud ? 1 : 0
    })
    let name = ud ? '上下摆风开启' : '上下摆风关闭';
    this.showControlToast(name);
    this.bufferCommand('setSwingUpDown', ud);
  },

  // 3. 功能键逻辑 (照明/氛围/负离子)
  toggleFunctionDropdown() {
    this.setData({
      showFunctionDropdown: !this.data.showFunctionDropdown,
      showModeDropdown: false,
      showSwingDropdown: false,
      showAddDeviceDropdown: false,
      showDeviceModal: false
    });
  },

  selectFunction(e) {

    wx.vibrateShort({ type: 'light' });
    // if (!this.checkPower()) return;
    if (!this.data.deviceStatus.online) {
      wx.showToast({
        title: '设备不在线',
        icon: 'error'
      })
      return;
    };

    const func = e.currentTarget.dataset.func;
    const s = this.data.deviceStatus;

    if (func === 'off') {
      this.setData({
        'deviceStatus.light': 0,
        'deviceStatus.fl': 0,
        'deviceStatus.fu': 0
      });
      this.showControlToast('关闭所有功能');
    } else if (func === 'light') {
      const newState = s.light === 1 ? 0 : 1;
      this.setData({ 'deviceStatus.light': newState });
      this.showControlToast(newState ? '照明开启' : '照明关闭');
    } else if (func === 'surround') {
      const newState = s.fl === 1 ? 0 : 1;
      this.setData({ 'deviceStatus.fl': newState });
      this.showControlToast(newState ? '氛围灯开启' : '氛围灯关闭');
    } else if (func === 'clean') {
      const newState = s.fu === 1 ? 0 : 1;
      this.setData({ 'deviceStatus.fu': newState });
      this.showControlToast(newState ? '负离子开启' : '负离子关闭');
    }

    // 更新指令触发发送
    this.bufferCommand('setLighting', true);
  },

  // 指令缓存（防抖）
  bufferCommand(action, value) {
    if (!this.commandTimers) {
      this.commandTimers = {};
    }

    // 停止后台持续刷新
    this.stopAutoRefresh();
    this.lastCommandTime = Date.now();

    // 清除该动作类型的现有定时器
    if (this.commandTimers[action]) {
      clearTimeout(this.commandTimers[action]);
      delete this.commandTimers[action];
    }

    // 设置新定时器
    this.commandTimers[action] = setTimeout(() => {
      this.sendControlCommand(action, value);
      delete this.commandTimers[action];
    }, 500); // 0.5秒内的连续操作只发送最后一次
  },

  // 发送控制指令
  async sendControlCommand(action, value) {
    const device = this.data.selectedDevice;
    const deiveiceOnline = this.data.deviceStatus.online
    //设备在线状态查询
    if (!device || !deiveiceOnline) return;
    this.setData({ showRefreshNotify: false })
    const deviceName = device.sn;
    this.lastCommandTime = Date.now();

    console.log(`[Remote] 发送指令 -> ${deviceName}: ${action} = ${value}`);

    try {
      const state = this.data.deviceStatus;
      let property = {};

      // 根据 action 构建指令对象
      switch (action) {
        case 'setPower':
          property.ps = value ? 1 : 0;
          break;
        case 'setTemperature':
          property.temp = value * 10; // value is in degree (5-40), temp property is 50-400
          break;
        case 'setWindSpeed':
          property.fs = value;
          break;
        case 'setMode':
          property.fm = value; // value is already 1-6
          break;
        case 'setLighting':
          property.light = state.light;
          property.fl = state.fl;
          property.fu = state.fu;
          break;
        case 'setSwingUpDown':
          property.sxbf = value ? 1 : 0;
          break;
        case 'setSwingLeftRight':
          property.zybf = value ? 1 : 0;
          break;
        case 'setTimer':
          property.timer = value;
          break;
      }

      // 如果蓝牙已连接，尝试通过蓝牙发送
      if (this.data.isBluetoothConnected && this.data.connectedDevice) {
        if (action === 'setTimer') {
          console.log('[Bluetooth] 触发定时指令发送:', this.data.deviceStatus.timer);
          this.sendBluetoothCommandTimer();
        } else {
          console.log('[Bluetooth] 尝试通过蓝牙发送普通指令');
          this.sendBluetoothCommand(this.data.deviceStatus);
        }
      }
      else if (device.connectionType === '4g') {
        const res = await deviceApi.setDeviceDesiredProperty(deviceName, property);
        if (!this.handleApiResult(res)) return;
        if (res && res.code === 200) {
          console.log('指令发送成功');
          // 设置成功后，不强制立即刷新，保留本地乐观更新的状态，等待自动刷新周期或下一次有效更新
          // 避免接口数据延迟导致的回跳
          await this.loadDeviceStatus(false);
        } else {
          wx.showToast({ title: res.msg || '设置失败', icon: 'none' });
        }
      }
    } catch (err) {
      console.error('指令发送失败:', err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      // 指令发送结束后，延迟 2 秒恢复自动刷新
      // 这里的延迟是为了等待设备状态在服务器/硬件端同步完成
      // if (this.resumeTimer) clearTimeout(this.resumeTimer);
      // this.resumeTimer = setTimeout(() => {
      //   if (this.isPageActive) {
      //     console.log('[Remote] 恢复自动刷新');
      //     // // this.resetInactivityTimer();
      //   }
      // }, 2000);
    }
  },

  // 辅助函数：检查电源状态
  checkPower() {
    if (this.data.deviceStatus.ps !== 1) {
      wx.showToast({ title: '请先开机', icon: 'error' });
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

  // 检查故障状态
  checkFaultStatus(newStatus) {
    const errCode = parseInt(newStatus.err) || 0;

    if (errCode > 0) {
      // 有故障，获取故障信息
      const faultInfo = FAULT_CODES[errCode];

      if (faultInfo) {
        console.log(`[Fault] 检测到故障 E${errCode}:`, faultInfo.title);
        this.setData({
          showFaultAlert: true,
          currentFaultInfo: {
            ...faultInfo,
            errCode: errCode
          }
        });

        // 震动提醒
        wx.vibrateLong();
      } else {
        // 未知故障代码
        console.warn(`[Fault] 未知故障代码: E${errCode}`);
        this.setData({
          showFaultAlert: true,
          currentFaultInfo: {
            code: `E${errCode}`,
            title: '未知故障',
            cause: '设备报告了一个未知的故障代码',
            solutions: ['请联系售后服务', '查看设备使用手册'],
            errCode: errCode
          }
        });
      }
    } else {
      // 无故障，关闭警告
      if (this.data.showFaultAlert) {
        console.log('[Fault] 故障已清除');
        this.setData({
          showFaultAlert: false,
          currentFaultInfo: null
        });
      }
    }
  },

  // 关闭故障警告
  closeFaultAlert() {
    this.setData({
      showFaultAlert: false
    });
  },

  // 跳转到维修手册
  goToManual() {
    wx.navigateTo({
      url: '/pages/manual/manual'
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

  //开始搜索
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
                console.log("发现设备:", device)
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

  //停止搜索蓝牙
  stopSearch() {
    if (this.searchCountdown) {
      clearInterval(this.searchCountdown);
      this.searchCountdown = null;
    }

    wx.stopBluetoothDevicesDiscovery({
      success: (res) => {
        console.log("停止蓝牙设备发现")
      }
    });
    wx.offBluetoothDeviceFound({
      success: (res) => {
        console.log("关闭蓝牙设备发现监听")
      }
    });
    this.setData({ isSearchingBluetooth: false });
  },

  //手动刷新蓝牙
  manualRefreshBluetooth() {
    this.stopSearch();
    wx.closeBluetoothAdapter();
    this.startBluetoothDiscovery();
  },

  //关闭蓝牙模式
  closeBluetoothModal() {
    this.stopSearch();
    wx.closeBluetoothAdapter();
    this.setData({ showBluetoothModal: false });
  },

  //连接蓝牙 (触发自搜索列表)
  connectToBluetooth(e) {
    const deviceId = e.currentTarget.dataset.id;
    const device = this.data.bluetoothDevices.find(d => d.deviceId === deviceId);
    this.stopSearch();
    wx.closeBluetoothAdapter({
      success: (res) => {
        console.log('成功关闭蓝牙适配器')
      }
    });
    if (device) {
      console.log('开始连接蓝牙设备')
      this._executeBTConnect(device);
    }
  },

  // 核心蓝牙连接执行逻辑
  _executeBTConnect(device) {
    const deviceId = device.deviceId;

    // 如果已经在连接中且是同一个设备，不再重复操作
    if (this.data.isBluetoothConnected && this.data.connectedDevice && this.data.connectedDevice.deviceId === deviceId) {
      this.setData({
        selectedDevice: this.data.deviceList.find(d => d.displayName === device.displayName || d.deviceId === deviceId),
        showBluetoothModal: false,
        showDeviceModal: false
      });
      wx.showToast({ title: '已连接', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在初始化蓝牙...', mask: true });

    // 必须首先初始化蓝牙适配器，否则会报 "not init" 错误
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('蓝牙适配器初始化成功');
        this.stopSearch(); // 停止可能的搜索
        this._startBLEConnection(deviceId, device);
      },
      fail: (err) => {
        console.error('蓝牙初始化失败', err);
        wx.hideLoading();
        if (err.errCode === 10001) {
          wx.showModal({
            title: '提示',
            content: '请检查手机蓝牙是否开启',
            showCancel: false
          });
        } else {
          wx.showToast({ title: '蓝牙初始化失败', icon: 'none' });
        }
      }
    });
  },

  // 内部方法：执行实际的蓝牙连接
  _startBLEConnection(deviceId, device) {
    wx.showLoading({ title: '正在连接设备...', mask: true });
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        console.log('蓝牙连接成功', res);

        // 构建蓝牙设备元数据对象
        const bluetoothDevice = {
          id: 'bt_' + deviceId,
          name: device.name || device.localName || '蓝牙设备',
          sn: device.sn || device.name || device.localName || '蓝牙设备',
          imei: deviceId,
          deviceId: deviceId,
          activationDate: device.activationDate || '--',
          warrantyDate: device.warrantyDate || '--',
          image: device.image || '',
          status: 'active',
          online: true,
          connectionType: 'bluetooth',
          signalStrength: 5
        };

        // 更新本地列表状态
        let deviceList = this.data.deviceList || [];
        const existingIndex = deviceList.findIndex(d => d.deviceId === deviceId);
        if (existingIndex === -1) {
          deviceList.push(bluetoothDevice);
        } else {
          deviceList[existingIndex] = bluetoothDevice;
        }

        const newSelectedIndex = deviceList.findIndex(d => d.deviceId === deviceId);

        this.setData({
          connectedDevice: device,
          isBluetoothConnected: true,
          showBluetoothModal: false,
          showDeviceModal: false,
          deviceList: deviceList,
          selectedDeviceIndex: newSelectedIndex,
          selectedDevice: bluetoothDevice,
          'deviceStatus.online': true,
          isQuickSearch: true
        });

        // 更新全局蓝牙状态
        app.globalData.bleDeviceId = deviceId;
        app.globalData.isBluetoothConnected = true;

        // 持久化保存
        let savedBTDevices = wx.getStorageSync('savedBTDevices') || [];
        const btIndex = savedBTDevices.findIndex(d => d.deviceId === deviceId);
        if (btIndex === -1) {
          savedBTDevices.push(bluetoothDevice);
        } else {
          savedBTDevices[btIndex] = bluetoothDevice;
        }
        wx.setStorageSync('savedBTDevices', savedBTDevices);
        wx.setStorageSync('selectedDeviceImei', bluetoothDevice.sn);

        wx.showToast({ title: '连接成功', icon: 'success' });

        // 获取服务并开始监听
        this.getBLEServices(deviceId)

      },
      fail: (err) => {
        console.error('蓝牙连接失败', err);
        wx.showToast({ title: '连接失败', icon: 'error' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  //获取服务id
  getBLEServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        console.log('获取服务列表成功', res.services);
        if (res.services.length > 0) {
          const serviceId = res.services[1] ? res.services[1].uuid : res.services[0].uuid;
          this.setData({ serviceId });
          app.globalData.bleServiceId = serviceId; // 同步到全局
          this.getBLECharacteristics(deviceId, serviceId);
        }
      }
    });
  },

  //获取特征id
  getBLECharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('获取特征值成功', res.characteristics);
        const writeChar = res.characteristics.find(c => c.properties.write);
        if (writeChar) {
          this.setData({ characteristicId: writeChar.uuid });
          app.globalData.bleWriteCharId = writeChar.uuid; // 同步到全局
        }
        wx.showToast({
          title: '蓝牙连接成功！',
          icon: 'success'
        })
        // 连接成功开始监听蓝牙信息
        this.startBluetoothDataListener();

        // 延迟发送状态查询指令，确保监听已就绪
        setTimeout(() => {
          this.getDeviceStatusByBluetooth();
        }, 500);
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

    // 26° 制冷模式 3档风速 默认开机指令 (如果不含头，7字节数据)
    // 原始: [0xAA, 0x39, 0x02, 0xB2, 0x1A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    // 数据部分从 index 3 开始: B2 1A 00 00 00 00 00
    // B2 = 1011 0010 (开机, 制冷(3), 风速3(2))
    const deviceStatus = finalData;
    console.log('发送蓝牙指令的状态：', deviceStatus)
    const buffer = new ArrayBuffer(12);
    const dataView = new DataView(buffer);
    let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

    // 帧头 发送蓝牙指令
    dataView.setUint8(0, 0xAA);
    dataView.setUint8(1, 0xF1);
    dataView.setUint8(2, 0x02);

    //Byte 3 开机 模式 风速
    if (deviceStatus.ps === 1) {
      data[0] = 0x80 | ((deviceStatus.fm + 1) << 4) | (Math.max(0, deviceStatus.fs));
    } else {
      data[0] = 0x00
    }

    //byte 4 照明 扫风 负离子 0.5度标志
    if (deviceStatus.light === 1) { data[1] |= 0x01 };
    if (deviceStatus.fu === 1) { data[1] |= 0x08 };
    if (deviceStatus.sxbf === 1) { data[1] |= 0x10 };
    if (deviceStatus.zybf === 1) { data[1] |= 0x20 };

    // Byte 5: Temp Mapping
    let realTemp = Math.floor(deviceStatus.temp / 10);
    let encodedTemp = 0;
    if (realTemp >= 15 && realTemp <= 32) {
      encodedTemp = realTemp - 15;
    } else if (realTemp >= 5 && realTemp <= 14) {
      encodedTemp = realTemp + 25;
    } else {
      // 默认兜底：限制在 5-32 范围内并按逻辑转换
      if (realTemp < 5) encodedTemp = 30;
      else if (realTemp > 32) encodedTemp = 17;
    }
    data[2] = encodedTemp;

    //byte 6: 锁定状态 不做操作
    data[3] = deviceStatus.lock

    //byte 7 :氛围灯 1-255随机 0关闭
    if (deviceStatus.fl === 1) data[4] |= Math.floor(Math.random() * 254) + 1

    // Byte 8-10: 保留

    // 填充数据到 DataView
    for (let i = 0; i < 8; i++) {
      dataView.setUint8(3 + i, data[i]);
    }

    // 计算校验位 (逻辑和取低8位，再取反)
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += dataView.getUint8(i);
    }
    let checksum = (~(sum & 0xFF)) & 0xFF;
    dataView.setUint8(11, checksum);

    // 格式化指令为16进制字符串以便打印
    let hexStr = "";
    for (let i = 0; i < dataView.byteLength; i++) {
      let b = dataView.getUint8(i).toString(16).toUpperCase();
      hexStr += (b.length === 1 ? "0" + b : b) + " ";
    }
    console.log('[蓝牙指令] 发送16进制:', hexStr);
    // 发送
    wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
        console.log('[蓝牙发送] 指令发送成功');
        console.log('指令发送返回信息', res)
        // 保存最后一次发送的指令（完整buffer转数组保存）
        // 转换 ArrayBuffer 为数组
        const sentBytes = [];
        for (let i = 0; i < 12; i++) sentBytes.push(dataView.getUint8(i));
        // wx.setStorageSync('lastCommand', sentBytes);
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

  //发送定时指令
  sendBluetoothCommandTimer() {
    const deviceStatus = this.data.deviceStatus;
    const buffer = new ArrayBuffer(12);
    const dataView = new DataView(buffer);

    // 帧头
    dataView.setUint8(0, 0xAA);
    dataView.setUint8(1, 0xF1);
    // 修改为 0x03 指令格式
    dataView.setUint8(2, 0x03);

    let timerData = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
    // timer[0]和timer[1]代表定时的时间，取值范围从1-480
    // 根据用户最新修改：timerData[1]放高位，timerData[0]放低位
    timerData[1] = (deviceStatus.timer >> 8) & 0xFF;
    timerData[0] = deviceStatus.timer & 0xFF;

    for (let i = 0; i < 8; i++) {
      dataView.setUint8(3 + i, timerData[i]);
    }

    // 计算校验位 (逻辑和取低8位，再取反)
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += dataView.getUint8(i);
    }
    let checksum = (~(sum & 0xFF)) & 0xFF;
    dataView.setUint8(11, checksum);

    let hexStr = "";
    for (let i = 0; i < dataView.byteLength; i++) {
      let b = dataView.getUint8(i).toString(16).toUpperCase();
      hexStr += (b.length === 1 ? "0" + b : b) + " ";
    }
    console.log('[蓝牙指令] 发送定时16进制:', hexStr);

    wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
        console.log('[蓝牙发送] 定时指令发送成功');
        console.log('指令发送返回信息', res)
      },
      fail: (err) => {
        console.error('[蓝牙发送] 定时指令发送失败', err);
        if (err.errCode === 10006) {
          this.setData({ isBluetoothConnected: false });
          wx.showToast({ title: '蓝牙连接已断开', icon: 'none' });
        }
      }
    });
  },

  //蓝牙查询设备状态
  getDeviceStatusByBluetooth() {
    if (!this.data.isBluetoothConnected) return;

    const buffer = new ArrayBuffer(12);
    const dataView = new DataView(buffer);
    let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

    dataView.setUint8(0, 0xAA);
    dataView.setUint8(1, 0xF1);
    dataView.setUint8(2, 0x01);

    for (let i = 0; i < 9; i++) {
      dataView.setUint8(3 + i, data[i]);
    }
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      sum += dataView.getUint8(i);
    }
    let checksum = (~(sum & 0xFF)) & 0xFF;
    dataView.setUint8(11, checksum);

    wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
        console.log('[蓝牙发送] 查询指令发送成功');
        // 保存最后一次发送的指令（完整buffer转数组保存）
        const sentBytes = [];
        for (let i = 0; i < 12; i++) sentBytes.push(dataView.getUint8(i));
        // wx.setStorageSync('lastCommand', sentBytes);
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

    let hexStr = "";
    for (let i = 0; i < dataView.byteLength; i++) {
      let b = dataView.getUint8(i).toString(16).toUpperCase();
      hexStr += (b.length === 1 ? "0" + b : b) + " ";
    }
    console.log('[蓝牙指令] 接收16进制:', hexStr);

    // 验证帧头
    if (dataView.getUint8(0) !== 0x55 || dataView.getUint8(1) !== 0x3D) {
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
    // const modeNames = ['通风', '睡眠', '制冷', '强劲', '自动', '制热', '除湿'];
    // const modeKeys = ['1', '2', '3', '4', '5', '6', '7'];
    parsedData.mode = modeValue - 1;

    // bit3-0: 风速
    parsedData.windSpeed = (byte3 & 0x0F);

    //byte 4:功能标志位
    const byte4 = dataView.getUint8(4);
    //bite 0:照明
    parsedData.ligth = (byte4 & 0x01) !== 0;
    //bite 1:新风（备用
    //bite 2:换气（备用
    //bite 3:负离子
    parsedData.fu = (byte4 & 0x08) !== 0;
    //bite 4:上下扫风
    parsedData.sxbf = (byte4 & 0x10) !== 0;
    //bite 5:左右扫风
    parsedData.zybf = (byte4 & 0x20) !== 0;
    //bite 6:0.5度标志，如果为1，返回的温度+0.5度
    parsedData.halfTemp = (byte4 & 0x40) !== 0;

    //byte 5:进风温度
    const byte5 = dataView.getUint8(5);
    let formatByte5 = byte5;
    parsedData.it = formatByte5;

    //byte 6:出风温度
    const byte6 = dataView.getUint8(6);
    parsedData.ot = byte6;

    //byte 7 - 8:电瓶电压
    const byte7 = dataView.getUint8(7);
    const byte8 = dataView.getUint8(8);
    parsedData.voltage = (byte8 * 256 + byte7);

    //byte 9 - 10:定时剩余时间 单位分钟
    const byte9 = dataView.getUint8(9);
    const byte10 = dataView.getUint8(10);
    parsedData.remainingTime = (byte9 + byte10 * 256);

    //byte 11:锁定状态
    const byte11 = dataView.getUint8(11);
    parsedData.lock = byte11;

    //byte 12:故障代码1
    const byte12 = dataView.getUint8(12);
    const fault1Value = {
      '0': 'none',
      '2': 'E2',
      '3': 'E3',
      '4': 'E4',
      '6': 'E6',
      '7': 'E7',
      '8': 'E8',
      '9': 'E9',
      '10': 'E10'
    }
    // if (!fault1Value[byte12]) {
    //   parsedData.err1 = fault1Value[0];
    // } else {
    //   parsedData.err1 = fault1Value[byte12];
    // }
    parsedData.err1 = byte12

    //byte 13:故障代码2
    const byte13 = dataView.getUint8(13);
    const fault2Value = {
      '1': 'E1/LU',
      '2': 'FJ/EF',
      '3': 'HU'
    }
    // if (!fault2Value[byte13]) {
    //   parsedData.err2 = '';
    // } else {
    //   parsedData.err2 = fault2Value[byte13];
    // }
    if (parsedData.err2 > 1) {
      parsedData.err2 = byte13 + 9;
    } else {
      parsedData.err2 = byte13;
    }

    const errCode = parsedData.err2 ? parsedData.err2 : parsedData.err1;

    //byte 14:设定温度
    const byte14 = dataView.getUint8(14);
    if (byte14 < 17) {
      parsedData.setTemp = byte14 + 15;
    }
    else if (byte14 > 29) {
      parsedData.setTemp = byte14 - 25;
    }

    //byte 15:氛围灯
    const byte15 = dataView.getUint8(15);
    parsedData.fl = byte15;

    // 打印解析结果
    console.log('[蓝牙接收] 解析数据:', parsedData);

    // 逻辑：如果是最近刚发送过指令（1.5秒内），则跳过本次设备上报的数据同步
    // 防止指令执行中设备返回旧状态导致 UI 抖动
    // if (this.lastCommandTime && (Date.now() - this.lastCommandTime < 1500)) {
    //   console.log('[蓝牙接收] 近期有指令发送，跳过本次状态同步以防抖动');
    //   return;
    // }

    // 更新界面状态
    this.setData({
      'deviceStatus.ps': parsedData.powerOn ? 1 : 0,
      'deviceStatus.fm': parsedData.mode,
      'deviceStatus.fs': parsedData.windSpeed,
      'deviceStatus.temp': parsedData.setTemp * 10,
      'deviceStatus.sxbf': parsedData.sxbf ? 1 : 0,
      'deviceStatus.zybf': parsedData.zybf ? 1 : 0,
      'deviceStatus.light': parsedData.ligth ? 1 : 0,
      'deviceStatus.fl': parsedData.fl,
      'deviceStatus.fu': parsedData.fu ? 1 : 0,
      'deviceStatus.it': parsedData.it,
      'deviceStatus.ot': parsedData.ot,
      'deviceStatus.bv': parsedData.voltage,
      'deviceStatus.err': errCode,
      'deviceStatus.online': true,
      'deviceStatus.lock': parsedData.lock,
      'deviceStatus.timer': parsedData.remainingTime,
      'deviceStatus.timerDisplay': this._formatTimerDisplay(parsedData.remainingTime),
    });
    console.log('蓝牙返回信息解析结果', this.data.deviceStatus)
    // 检查故障状态
    this.checkFaultStatus(this.data.deviceStatus);
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

    wx.onBLEConnectionStateChange((res) => {
      console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
      if (!res.connected) {
        app.globalData.isBluetoothConnected = false;
        app.globalData.bleDeviceId = '';
        app.globalData.bleServiceId = '';
        app.globalData.bleWriteCharId = '';

        this.stopBluetoothDataListener();

        wx.showModal({
          title: '连接异常',
          content: '蓝牙连接已断开',
          showCancel: false
        });

        this.setData({
          isBluetoothConnected: false,
          connectedDevice: null,
          'deviceStatus.online': false
        });
      }
    })
  },

  /**
   * 停止蓝牙数据监听
   */
  stopBluetoothDataListener() {
    console.log('正在关闭蓝牙监听...');

    // 取消特征值变化监听
    wx.offBLECharacteristicValueChange();
    // 取消连接状态变化监听
    wx.offBLEConnectionStateChange();

    if (this.data.connectedDevice && this.data.serviceId && this.data.characteristicId) {
      // 停止notify
      wx.notifyBLECharacteristicValueChange({
        deviceId: this.data.connectedDevice.deviceId,
        serviceId: this.data.serviceId,
        characteristicId: this.data.characteristicId,
        state: false,
        success: () => {
          console.log('[蓝牙接收] 数据监听已停止');
        },
        fail: (err) => {
          console.error('[蓝牙接收] 停止监听失败', err);
        }
      });
    }
  },

  onLogout() {
    this.setData({
      deviceList: [],
      selectedDeviceIndex: -1,
      selectedDevice: null,
      deviceStatus: {
        ps: 0, temp: 250, fs: 1, fm: 5, fl: 0, light: 0, lock: 0,
        sxbf: 0, zybf: 0, fu: 0, timer: 0, bv: 0, it: 0, ot: 0, err: 0,
        online: false, signalStrength: 0, clock: false,
        timerDisplay: '00:00'
      }
    });
  },

  // 统一处理 API 返回结果，校验登录态
  handleApiResult(res) {
    if (res && res.code === 401) {
      wx.stopPullDownRefresh();
      // 清除可能的轮询
      this.stopAutoRefresh();

      wx.showModal({
        title: '提醒',
        content: '登录信息已过期，请重新登录',
        showCancel: false,
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.onGoLogin();
          }
        }
      });
      return false;
    }
    return true;
  }
});
