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

    // 初始化属性锁定器与指令队列
    this._propLocks = {};
    this._cmdQueue = [];
    this._isProcessingQueue = false;
    this._refreshMode = 'STOPPED';
    this._statusFailCount = 0; // 初始化连续失败计数器
    console.log('加载页面onLoad完毕')
  },

  // 锁定某个属性，防止自动刷新在短时间内覆盖 UI
  lockProperty(prop) {
    if (!this._propLocks) this._propLocks = {};
    this._propLocks[prop] = Date.now();
    console.log(`[Lock] 锁定属性: ${prop}`);
  },

  // 检查属性是否处于锁定状态 (3.5秒内)
  isPropertyLocked(prop) {
    if (!this._propLocks) return false;
    const lockTime = this._propLocks[prop];
    if (!lockTime) return false;
    const isLocked = (Date.now() - lockTime) < 3500;
    if (!isLocked) {
      delete this._propLocks[prop]; // 过期自动清除
    }
    return isLocked;
  },

  //下拉刷新事件
  onPullDownRefresh: function () {
    this.onShow();
    wx.showToast({
      title: '刷新成功',
    })
  },

  onShow() {
    this.isPageActive = true;
    this.UserInfoStorageCheck();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }

    console.log("显示client/index");
    this.loadUserData().then(() => {
      // 页面显示时，执行一次同步并在空闲时启动轮询
      if (this.isPageActive) {
        this.initPolling(); // 初始化
        this.loadDeviceStatus(true); // 立即同步一次
        this.startIdlePolling(); // 启动3s轮询
      }
    });

    console.log("client/index加载完毕");
    this.setData({
      showRefreshNotify: false
    })
    setTimeout(() => { wx.hideLoading(); }, 1500);
    wx.stopPullDownRefresh();
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
    this.isPageActive = false;
    this.stopAllPolling();
    console.log('onHide()事件触发，已清除所有定时器');
  },

  onUnload() {
    this.isPageActive = false;
    this.stopAllPolling();
    console.log('onUnload()事件触发，已清除所有定时器和连接');
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
    this.stopAllPolling();
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
    this.initPolling();
    this.loadDeviceStatus(true);
    this.startIdlePolling();
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

  // 加载设备状态返回处理 (支持版本控制中断)
  async loadDeviceStatus(force = false, expectedVersion) {
    // 检查版本号：如果当前全局版本号已经大于请求时的版本号，说明有新SET指令插入，直接丢弃本次GET结果
    const currentVersion = this._dataVersion || 0;
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      console.log(`[System] GET请求过期 (Req v${expectedVersion} < curr v${currentVersion}), 已中断`);
      return;
    }

    if (this._isLoadingStatus) return;
    this._isLoadingStatus = true;

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
          // 二次检查版本号：防止在 API 请求期间产生的新指令被旧数据覆盖
          const postRequestVersion = this._dataVersion || 0;
          if (expectedVersion !== undefined && expectedVersion !== postRequestVersion) {
            console.log(`[System] GET响应丢弃 (响应回传时 v${postRequestVersion} > 发起时 v${expectedVersion})`);
            return;
          }

          this._statusFailCount = 0; // 成功则重置失败计数
          overTimeCount = 0;
          const props = res.data.properties;
          const signal = res.data.csq;
          //如果是强制通过指令后更新，或者过了不更新期，则同步远程状态
          if (force || !this.lastCommandTime || Date.now() - this.lastCommandTime > 2000) {
            // ... (keep existing filtering logic if needed, or just simplified below)

            // 过滤掉当前正在锁定的属性，防止 UI 回跳
            const filteredProps = {};
            if (props) {
              Object.keys(props).forEach(key => {
                if (!this.isPropertyLocked(key)) {
                  filteredProps[key] = props[key];
                }
              });
            }

            this.setData({
              deviceStatus: {
                ...this.data.deviceStatus,
                ...filteredProps,
                online: true,
                signalStrength: signal || 0,
                clock: props.timer > 0,
                timerDisplay: this._formatTimerDisplay(props.timer !== undefined ? props.timer : this.data.deviceStatus.timer)
              },
              deviceOnline: true,
              isQuickSearch: true
            });

            // 设备在线，尝试启动空闲轮询 (如果尚未启动)
            this.startIdlePolling();
          }
          console.log("本地保存设备状态:", this.data.deviceStatus)
        }
        else if (res.code === 500) {
          this._statusFailCount = (this._statusFailCount || 0) + 1;
          console.warn(`[System] GET请求失败 (${this._statusFailCount}/3): ${res.msg}`);

          // 只有连续失败3次才彻底停止并提示
          if (this._statusFailCount >= 3) {
            if (res.msg === '获取属性失败:设备不在线') {
              wx.showToast({ title: '设备已离线', icon: 'error' });
              this.setData({ deviceStatus: this.data.offlineDeviceStatus });
            } else {
              wx.showToast({ title: '连接不稳定，已停止刷新', icon: 'none' });
            }

            this.stopAllPolling();
            this.setData({ showRefreshNotify: true });
          } else {
            // 失败次数未达上限，静默处理，等待下一个轮询周期重试
            console.log('[System] 偶发性错误，尝试在下个周期自动修复...');
            // 如果是 FINAL_GET 失败了，确保依然能恢复 IDLE 轮询
            if (force) { this.startIdlePolling(); }
          }
        }
      }
      console.log('加载当前选中设备：', device)
    } catch (error) {
      console.error('加载设备状态失败:', error);
    } finally {
      this._isLoadingStatus = false;
      this.checkFaultStatus(this.data.deviceStatus);
    }
  },

  // --- 双模式智能轮询核心系统 ---

  // 初始化轮询状态
  initPolling() {
    if (this._dataVersion === undefined) this._dataVersion = 0;
    this._cmdQueue = [];
    this._isProcessingQueue = false;
    this.stopAllPolling();
  },

  // 停止所有轮询和计时
  stopAllPolling() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this._longPressDelay) clearTimeout(this._longPressDelay); // Clear long press timers too
    if (this._longPressTimer) clearInterval(this._longPressTimer); // Clear long press timers too
    if (this._idleTimeout) clearTimeout(this._idleTimeout); // Clear inactivity timer
    this._pollTimer = null;
    this._debounceTimer = null;
    this._longPressDelay = null;
    this._longPressTimer = null;
    this._idleTimeout = null;
    console.log('[System] 已停止所有轮询和计时');
  },

  // 开启空闲轮询 (默认模式: 每3s执行一次GET)
  startIdlePolling() {
    if (this._pollTimer) return; // 避免重复开启
    // 检查基本条件
    const { userInfo, hasUserInfo, selectedDevice, deviceStatus } = this.data;
    if (!userInfo || !hasUserInfo || !selectedDevice || !this.isPageActive) return;

    // 关键逻辑：如果不在线，禁止启动轮询
    if (!deviceStatus.online) {
      console.log('[System] 设备不在线，停止/不启动空闲轮询');
      return;
    }

    console.log('[System] 启动空闲轮询模式 (3s interval)');
    this.resetInactivityTimer(); // 启动/重置 5分钟超时计时器

    this._pollTimer = setInterval(() => {
      if (this.isPageActive) {
        // 二次检查在线状态
        if (!this.data.deviceStatus.online) {
          this.stopAllPolling();
          return;
        }

        const hasIdleGet = this._cmdQueue.some(t => t.type === 'IDLE_GET');
        if (!hasIdleGet) {
          this._enqueueTask({ type: 'IDLE_GET' });
        }
      }
    }, 3 * 1000);
  },

  // 重置空闲计时器 (5分钟无操作则停止刷新)
  resetInactivityTimer() {
    if (this._idleTimeout) clearTimeout(this._idleTimeout);
    this._idleTimeout = setTimeout(() => {
      console.log('[System] 5分钟无操作，停止刷新');
      this.stopAllPolling();
      this.setData({
        showRefreshNotify: true
      });
      wx.showToast({
        title: '已停止刷新，下拉可重新连接',
        icon: 'none',
        duration: 3000
      });
    }, 5 * 60 * 1000);
  },



  // 统一任务队列入队
  _enqueueTask(task) {
    if (!this._cmdQueue) this._cmdQueue = [];
    this._cmdQueue.push(task);
    if (!this._isProcessingQueue) {
      this._processNextInQueue();
    }
  },

  // 队列处理器
  async _processNextInQueue() {
    if (this._cmdQueue.length === 0) {
      this._isProcessingQueue = false;
      // 如果队列为空，且没有防抖计时器在运行，则尝试恢复空闲轮询
      if (!this._debounceTimer && !this._pollTimer && this.isPageActive && this.data.deviceStatus.online) {
        console.log('[System] 队列处理完毕，尝试恢复空闲轮询');
        this.startIdlePolling();
      }
      return;
    }

    this._isProcessingQueue = true;
    const task = this._cmdQueue.shift();

    try {
      if (task.type === 'SET') {
        console.log(`[Queue] 执行SET: ${task.action},${task.value}`);
        await this.sendControlCommand(task.action, task.value);
      } else if (task.type === 'IDLE_GET' || task.type === 'FINAL_GET') {
        // --- 核心优化：指令插队拦截 ---
        // 如果当前是 GET 任务，但队列中出现了新的 SET 任务，则立即放弃本次 GET，优先处理 SET
        const hasPendingSet = this._cmdQueue.some(t => t.type === 'SET');
        if (hasPendingSet) {
          console.warn(`[Queue] 检测到待处理SET指令，跳过本次${task.type}以保障响应速度`);
          return; // finally 会触发下一条任务（即那个SET）
        }

        console.log(`[Queue] 执行${task.type}，版本号: v${this._dataVersion}`);
        const isFinal = task.type === 'FINAL_GET';
        await this.loadDeviceStatus(isFinal, this._dataVersion);

        if (isFinal) {
          console.log('[System] 最终验证完成，恢复空闲轮询');
          if (this.data.deviceStatus.online) {
            this.startIdlePolling();
          }
        }
      }
    } catch (e) {
      console.error('[Queue] 执行异常:', e);
    } finally {
      // --- 核心优化：断开递归栈 ---
      // 使用 setTimeout 确保这一长串指令处理不会阻塞 UI 线程的主循环
      setTimeout(() => {
        this._processNextInQueue();
      }, 0);
    }
  },

  // --- UI 控制处理器 ---

  async togglePower() {
    wx.vibrateShort({ type: 'light' });
    const device = this.data.selectedDevice;
    const status = this.data.deviceStatus;

    if (!device || !status.online) {
      wx.showToast({ title: '设备不在线', icon: 'error' });
      return;
    }

    const nextPs = status.ps === 1 ? 0 : 1;
    this.setData({ 'deviceStatus.ps': nextPs });
    wx.showToast({ title: nextPs ? '正在开机...' : '正在关机...', icon: 'loading' }, 1 * 1000);
    this.bufferCommand('setPower', nextPs);
  },



  increaseWindSpeed(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    let speed = this.data.deviceStatus.fs || 1;
    if (speed < 5) {
      speed++;
      this.data.deviceStatus.fs = speed; // 同步更新以便连续点击读到新值
      this.setData({ 'deviceStatus.fs': speed });
      this.showWindSpeedToast(speed);
      this.bufferCommand('setWindSpeed', speed);
    }
  },

  decreaseWindSpeed(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    let speed = this.data.deviceStatus.fs || 1;
    if (speed > 1) {
      speed--;
      this.data.deviceStatus.fs = speed; // 同步更新以便连续点击读到新值
      this.setData({ 'deviceStatus.fs': speed });
      this.showWindSpeedToast(speed);
      this.bufferCommand('setWindSpeed', speed);
    }
  },

  // 显示风速提示
  showWindSpeedToast(speed) {
    wx.showToast({
      title: `风速 ${speed} 档`,
      icon: 'none',
      duration: 500, // Short duration
      mask: false
    });
  },

  increaseTemperature(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    let temp = Math.floor((this.data.deviceStatus.temp || 250) / 10);
    if (temp < 32) {
      temp++;
      this.data.deviceStatus.temp = temp * 10; // 同步更新
      this.setData({ 'deviceStatus.temp': temp * 10 });
      this.bufferCommand('setTemperature', temp);
    }
  },

  decreaseTemperature(isLongPress = false) {
    if (!this.checkPower()) return;
    if (!isLongPress) wx.vibrateShort({ type: 'medium' });
    let temp = Math.floor((this.data.deviceStatus.temp || 250) / 10);
    if (temp > 5) {
      temp--;
      this.data.deviceStatus.temp = temp * 10; // 同步更新
      this.setData({ 'deviceStatus.temp': temp * 10 });
      this.bufferCommand('setTemperature', temp);
    }
  },

  // 长按控制
  onControlStart(e) {
    const action = e.currentTarget.dataset.action;
    if (!this[action]) return;

    // 清除上一次可能的残留定时器（防止响应重叠）
    if (this._longPressDelay) clearTimeout(this._longPressDelay);
    if (this._longPressTimer) clearInterval(this._longPressTimer);

    this.isLongPressing = true;
    this[action](false);

    this._longPressDelay = setTimeout(() => {
      this._longPressTimer = setInterval(() => {
        this[action](true);
      }, 150);
    }, 500);
  },

  onControlEnd() {
    this.isLongPressing = false;
    if (this._longPressDelay) clearTimeout(this._longPressDelay);
    if (this._longPressTimer) clearInterval(this._longPressTimer);
  },

  // 弹出菜单切换逻辑
  toggleModeDropdown() {
    this.setData({
      showModeDropdown: !this.data.showModeDropdown,
      showSwingDropdown: false,
      showFunctionDropdown: false,
      showAddDeviceDropdown: false,
      showDeviceModal: false
    });
  },

  toggleSwingDropdown() {
    this.setData({
      showSwingDropdown: !this.data.showSwingDropdown,
      showModeDropdown: false,
      showFunctionDropdown: false,
      showAddDeviceDropdown: false,
      showDeviceModal: false
    });
  },

  toggleFunctionDropdown() {
    this.setData({
      showFunctionDropdown: !this.data.showFunctionDropdown,
      showModeDropdown: false,
      showSwingDropdown: false,
      showAddDeviceDropdown: false,
      showDeviceModal: false
    });
  },

  // 模式与摆风切换
  selectMode(e) {
    const mode = parseInt(e.currentTarget.dataset.mode, 10);
    if (isNaN(mode) || !this.checkPower()) return;

    wx.vibrateShort({ type: 'light' });
    this.data.deviceStatus.fm = mode; // 同步更新本地副本
    this.setData({ 'deviceStatus.fm': mode, showModeDropdown: false });

    const modeName = { 0: '通风', 1: '睡眠', 2: '制冷', 3: '强劲', 4: '自动', 5: '制热' }[mode] || '自动';
    this.showControlToast(`${modeName}模式`);
    this.bufferCommand('setMode', mode);
  },

  selectSwing(e) {
    const type = e.currentTarget.dataset.type;
    if (!this.checkPower()) return;

    wx.vibrateShort({ type: 'light' });
    if (type === 'ud') {
      const next = this.data.deviceStatus.sxbf === 1 ? 0 : 1;
      this.setData({ 'deviceStatus.sxbf': next });
      this.showControlToast(next ? '开启上下摆风' : '关闭上下摆风');
      this.bufferCommand('setSwingUpDown', next);
    } else if (type === 'lr') {
      const next = this.data.deviceStatus.zybf === 1 ? 0 : 1;
      this.setData({ 'deviceStatus.zybf': next });
      this.showControlToast(next ? '开启左右摆风' : '关闭左右摆风');
      this.bufferCommand('setSwingLeftRight', next);
    }
  },

  selectFunction(e) {
    const func = e.currentTarget.dataset.func;
    const s = this.data.deviceStatus;
    if (!s.online) return;

    wx.vibrateShort({ type: 'light' });
    if (func === 'off') {
      this.data.deviceStatus.light = 0;
      this.data.deviceStatus.fl = 0;
      this.data.deviceStatus.fu = 0;
      this.setData({ 'deviceStatus.light': 0, 'deviceStatus.fl': 0, 'deviceStatus.fu': 0 });
      this.showControlToast('关闭所有额外功能');
    } else {
      const val = s[func] === 1 ? 0 : 1;
      this.data.deviceStatus[func] = val; // 同步更新本地副本
      this.setData({ [`deviceStatus.${func}`]: val });
      const names = { 'light': '照明', 'fl': '氛围灯', 'fu': '负离子' };
      this.showControlToast((names[func] || '功能') + (val ? '开启' : '关闭'));
    }
    this.bufferCommand('setLighting', true);
  },

  // 中断逻辑：收到SET指令
  bufferCommand(action, value) {
    console.log(`[System] 收到SET指令: ${action}, 中断当前/挂起GET`);
    this.resetInactivityTimer(); // 用户操作，重置5分钟计时

    // 1. 版本号自增 (核心：任何正在进行的GET请求回来后对比版本号，不一致则丢弃)
    this._dataVersion = (this._dataVersion || 0) + 1;

    // 2. 立即停止空闲轮询并尝试清除挂起提示（自动唤醒）
    if (this.data.showRefreshNotify) {
      console.log('[System] 监测到用户操作，正在自动唤醒通讯链路...');
      this.setData({ showRefreshNotify: false });
      this._statusFailCount = 0; // 重置错误计数
    }

    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }

    // 3. 重置防抖计时器 (每次新SET到来都重置)
    if (this._debounceTimer) clearTimeout(this._debounceTimer);

    // 4. 属性锁定 (保持界面稳定)
    const actionToProp = {
      'setPower': ['ps'], 'setTemperature': ['temp'], 'setWindSpeed': ['fs'],
      'setMode': ['fm'], 'setLighting': ['light', 'fl', 'fu'],
      'setSwingUpDown': ['sxbf'], 'setSwingLeftRight': ['zybf'], 'setTimer': ['timer']
    };
    if (actionToProp[action]) actionToProp[action].forEach(p => this.lockProperty(p));

    // 5. 指令发送消抖 (针对温度、风速、摆风、灯光等连续操作)
    const debounceActions = ['setTemperature', 'setWindSpeed', 'setSwingUpDown', 'setSwingLeftRight', 'setLighting'];
    if (debounceActions.includes(action)) {
      if (!this._cmdDebounceTimers) this._cmdDebounceTimers = {};

      // 清除旧计时器
      if (this._cmdDebounceTimers[action]) {
        clearTimeout(this._cmdDebounceTimers[action]);
      }

      // 设置新计时器 (250ms 后执行入队)
      this._cmdDebounceTimers[action] = setTimeout(() => {
        this._executeEnqueue(action, value);
        delete this._cmdDebounceTimers[action];
      }, 250);

      console.log(`[Debounce] 指令已延迟: ${action} -> ${value}`);
    } else {
      // 非消抖指令直接执行
      this._executeEnqueue(action, value);
    }

    // 6. 开启/重置 1.5s 防抖计时器 -> 执行最终验证 -> 恢复轮询
    this._debounceTimer = setTimeout(() => {
      console.log('[System] SET序列结束且1.5s静默，执行最终验证 (FINAL_GET)');
      this._enqueueTask({ type: 'FINAL_GET' });
    }, 1500);
  },

  // 内部方法：执行实际入队
  _executeEnqueue(action, value) {
    // 检查队列中是否已有相同action的SET指令，如果有则更新其value，否则添加
    const existingSetIndex = this._cmdQueue.findIndex(t => t.type === 'SET' && t.action === action);
    if (existingSetIndex > -1) {
      this._cmdQueue[existingSetIndex].value = value;
      console.log(`[Queue] 覆盖待执行指令: ${action}`);

      // 如果队列处理器已停止但队列不为空，重新唤醒 (Safety Check)
      if (!this._isProcessingQueue && this._cmdQueue.length > 0) {
        console.warn('[Queue] 队列非运行状态，重新激活执行');
        this._processNextInQueue();
      }
    } else {
      this._enqueueTask({ type: 'SET', action, value });
    }
  },

  // 实际发送指令到 API
  async sendControlCommand(action, value) {
    const device = this.data.selectedDevice;
    if (!device || !this.data.deviceStatus.online) return;

    // 更新最后指令执行时间，用于 loadDeviceStatus 的不更新期判断
    this.lastCommandTime = Date.now();
    let property = {};
    const s = this.data.deviceStatus;
    switch (action) {
      case 'setPower': property.ps = value; break;
      case 'setTemperature': property.temp = value * 10; break;
      case 'setWindSpeed': property.fs = value; break;
      case 'setMode': property.fm = value; break;
      case 'setLighting': property.light = s.light; property.fl = s.fl; property.fu = s.fu; break;
      case 'setSwingUpDown': property.sxbf = value; break;
      case 'setSwingLeftRight': property.zybf = value; break;
      case 'setTimer': property.timer = value; break;
    }

    // 根据当前设备连接类型发送指令
    try {
      if (device.connectionType === 'bluetooth') {
        if (this.data.isBluetoothConnected) {
          action === 'setTimer' ? this.sendBluetoothCommandTimer() : this.sendBluetoothCommand(s);
        } else {
          wx.showToast({ title: '蓝牙未连接', icon: 'none' });
        }
      } else {
        // 默认为 4G 发送
        const res = await deviceApi.setDeviceDesiredProperty(device.sn, property);
        if (res && res.code !== 200) wx.showToast({ title: res.msg || '操作失败', icon: 'none' });
      }
    } catch (err) {
      console.error('[Remote] 指令发送系统故障:', err);
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

    // 构造待更新的数据，并检查属性锁定
    const updatePayload = {};
    const bluetoothMap = {
      'ps': parsedData.powerOn ? 1 : 0,
      'fm': parsedData.mode,
      'fs': parsedData.windSpeed,
      'temp': parsedData.setTemp * 10,
      'sxbf': parsedData.sxbf ? 1 : 0,
      'zybf': parsedData.zybf ? 1 : 0,
      'light': parsedData.ligth ? 1 : 0,
      'fl': parsedData.fl,
      'fu': parsedData.fu ? 1 : 0,
      'it': parsedData.it,
      'ot': parsedData.ot,
      'bv': parsedData.voltage,
      'err': errCode,
      'lock': parsedData.lock,
      'timer': parsedData.remainingTime
    };

    Object.keys(bluetoothMap).forEach(key => {
      if (!this.isPropertyLocked(key)) {
        updatePayload[`deviceStatus.${key}`] = bluetoothMap[key];
      } else {
        console.log(`[Bluetooth/Lock] 正在跳过锁定属性: ${key}`);
      }
    });

    // 总是更新的非锁定状态
    updatePayload['deviceStatus.online'] = true;
    updatePayload['deviceStatus.timerDisplay'] = this._formatTimerDisplay(parsedData.remainingTime);

    this.setData(updatePayload);
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
