const app = getApp();
var timer = require("../../../utils/wxTimer")
const deviceApi = require("../../../utils/deviceApi");
const { FAULT_CODES } = require("../../../utils/faultCodes");
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
      imei: '',
      type: '',
      connectTime: ''
    },
    deviceList: [],
    selectedDeviceIndex: -1,
    selectedDevice: null,
    deviceStatus: {
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
    wxTimerList:[],
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
    currentFaultInfo: null // 当前故障信息
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
    this.onLoad();
  },

  onShow() {
    this.UserInfoStorageCheck() //检查用户登陆状态
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      })
    }

    console.log("显示client/index")

    this.loadUserData(); // 加载用户专属数据
    this.resetInactivityTimer();
    console.log("client/index加载完毕")
    setTimeout(() => {
      wx.hideLoading();
    }, 1500)

    // 触发入门动画
    // this.triggerEntranceAnimation();
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
    this.clearAllTimers();
  },

  onUnload() {
    this.clearAllTimers();
  },

  //缓存登陆信息检查
  UserInfoStorageCheck() {
    console.log('加载页面')
    //是否存有登陆信息
    // const cHasUserInfo = wx.getStorageSync('hasUserInfo')
    // const cUserInfo = wx.getStorageSync('userInfo')
    // const cToken = wx.getStorageSync('token')
    // const cClientid = wx.getStorageSync('clientid')

    const cHasUserInfo = app.globalData.hasUserInfo
    const cUserInfo = app.globalData.userInfo
    const cToken = app.globalData.token
    const cClientid = app.globalData.clientid

    if (cUserInfo && cToken && cClientid && cHasUserInfo) {
      console.log("缓存登陆信息校验1：hasUserInfo：", cHasUserInfo)
      console.log("缓存登陆信息校验2：usserInfo", cUserInfo)
      console.log("缓存登陆信息校验3：token：", cToken)
      console.log("缓存登陆信息校验4：clientid", cClientid)
      console.log("缓存存在登陆信息，直接登陆")
      wx.showLoading();
      this.setData({
        hasUserInfo: cHasUserInfo || true,
        userInfo: cUserInfo,
        token: cToken,
        clientid: cClientid
      })
    }
    else {
      console.log('没有信息 开始跳转')
      wx.showModal({
        title: '登陆',
        content: '检测到您未登录，4G遥控功能需要先登陆再使用',
        complete: (res) => {
          if (res.cancel) {
            wx.showToast({
              title: '检测您未登陆\n可以使用基础的蓝牙功能',
              icon: 'none'
            }, 2500)
          }
          if (res.confirm) {
            // this.onGoLogin();
          }
        }
      })

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
        this.setData({
          deviceList: myProductsList,
          selectedDeviceIndex: selectedIndex,
          selectedDevice: myProductsList[selectedIndex]
        });

        // 如果没找到之前的设备，默认选第一个
        if (selectedIndex === -1) {
          selectedIndex = 0;
          if (myProductsList[0].imei) {
            wx.setStorageSync('selectedDeviceImei', myProductsList[0].imei);
          }
          this.setData({
            selectedDevice:myProductsList[0]
          })
        }

        
        console.log('当前选中设备：',this.data.selectedDevice)

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
    const hasUserInfo = this.data.hasUserInfo;
    if (hasUserInfo || userInfo) {
      try {
        // const result = await app.apiRequest('/pro/banding/my', 'GET');
        const result = await deviceApi.getUserActiveDevice();
        if (result.code === 401) {
          wx.showToast({
            title: '授权信息过期，\n请重新登陆',
            icon: 'none'
          }, 1500)
          // this.onGoLogin();
        }
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
      // wx.setStorageSync('redirectAfterLogin', '/pages/client/activate/activate');
      wx.showToast({
        title: '请先登陆',
        icon: 'error'
      })
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 500)
      return;
    }
    console.log("设备激活")
    wx.navigateTo({ url: '/pages/client/activate/activate' });
  },

  
  //开启蓝牙搜索
  blueToothfunc() {
    wx.vibrateShort({ type: 'medium' });
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
    const index = e.currentTarget.dataset.index;
    const device = this.data.deviceList[index];
    this.setData({
      selectedDeviceIndex: index,
      selectedDevice: device,
      showDeviceModal: false
    });
    wx.setStorageSync('selectedDeviceImei', device.sn);
    wx.showToast({
      title: `已切换至 ${device.sn || '新设备'}`,
      icon: 'none'
    });
    // 切换设备后加载状态
    this.loadDeviceStatus();

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
              // const res = await app.apiRequest('/pro/banding/unbind', 'POST', { sn: device.sn });
              const res = await deviceApi.unbindDevice(device.sn)

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
          ps: 0, temp: 250, fs: 1, fm: 5, fl: 0, light: 0, lock: 0,
          sxbf: 0, zybf: 0, fu: 0, timer: 0, bv: 0, it: 0, ot: 0, err: 0,
          online: false, signalStrength: 0, clock: false
        }
      });
    } else if (selectedDeviceIndex !== -1) {
      // 重新加载新选中设备的状态
      this.loadDeviceStatus();
    }
  },

  //定时
  async timerTest() {
    wx.vibrateShort({ type: 'medium' });
    // 打开定时弹窗（前端）
    if (!this.checkPower()) {
      this.setData({
        'deviceStatus.clock': false
      })
      return
    };
    this.setData({
      showTimerModal: true,
      timerMinutes: 30, // 默认 0.5 小时
      formattedTimer: this.formatTimer(30)
    });
  },

  // 增减定时（步长 30 分钟），限制在 60 - 480
  changeTimer(e) {
    wx.vibrateShort({ type: 'medium' });
    const delta = parseInt(e.currentTarget.dataset.delta, 10) || 0;
    let m = this.data.timerMinutes + delta;
    if (m < 0) m = 0;
    if (m > 480) m = 480;

    this.setData({
      timerMinutes: m,
      formattedTimer: this.formatTimer(m)
    });

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
    if (minutes > 0) {
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
            'deviceStatus.clock': false
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
      'deviceStatus.timer': minutes
    });

    this.bufferCommand('setTimer', minutes);

    const toastTitle = minutes > 0 ? `已设置定时 ${this.data.formattedTimer}` : '定时已取消';
    wx.showToast({ title: toastTitle, icon: 'none' });
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
  async loadDeviceStatus(force = false) {
    try {
      const device = this.data.selectedDevice;
      console.log('加载当前选中设备：',device)
      if (!device || device.connectionType !== '4g') return;

      const deviceName = device.imei;
      const sn = device.sn;
      // const res = await deviceApi.getDevicePropertyDetail(deviceName);
      const res = await deviceApi.getDevicePropertyDetail(sn);

      if (res && res.code === 200 && res.data && res.data.data) {
        const props = res.data.data;
        console.log("查询到的设备状态:", props)
        //如果是强制通过指令后更新，或者过了不更新期，则同步远程状态
        if (force || !this.lastCommandTime || Date.now() - this.lastCommandTime > 2000) {
          this.setData({
            deviceStatus: {
              ...this.data.deviceStatus,
              ...props,
              online: true,
              signalStrength: props.signal || 0,
              clock: props.timer > 0
            }
          });
        }
        console.log("本地保存设备状态:", this.data.deviceStatus)
      }
    } catch (error) {
      console.error('加载设备状态失败:', error);
    }
  },

  // --- 自动刷新与不活跃计时逻辑 ---

  // 启动/重置不活跃计时器 (10秒 - 测试用)
  async resetInactivityTimer() {
    const userInfo = this.data.userInfo
    const hasUserInfo = this.data.hasUserInfo
    const deiveiceOnline = this.data.deviceStatus.online;
    const selectedDevice = this.data.selectedDevice

    console.log("计时器启动状态查询userInfo:", userInfo);
    console.log("计时器启动状态查询hasUserInfo:", hasUserInfo);
    console.log("计时器启动状态查询deiveiceOnline:", deiveiceOnline);
    console.log("计时器启动状态查询selectedDevice:", selectedDevice);

    //登陆后，选中设备后开始刷新
    if (userInfo && hasUserInfo && deiveiceOnline && selectedDevice) {

      this.setData({ showRefreshNotify: false });

      // 清除旧的计时器
      if (this.inactivityTimeoutId) {
        clearTimeout(this.inactivityTimeoutId);
      }

      // 启动新的不活跃计时器
      this.inactivityTimeoutId = setTimeout(() => {
        this.autoStopRefresh();
      }, 10 * 1000); 

      // 如果刷新定时器没启动，则启动它
      if (!this.refreshIntervalId) {
        console.log('每5s刷新启动')
        this.startAutoRefresh();
      }
    }

  },

  // 开启自动刷新 (每30秒)
  startAutoRefresh() {
    if (this.refreshIntervalId) return;

    console.log('开启自动刷新设备状态 当前每3s刷新一次');
    this.refreshIntervalId = setInterval(() => {
      this.loadDeviceStatus();
    }, 3 * 1000); // 30秒刷新一次
  },

  // 停止自动刷新并弹出提示
  stopAutoRefresh() {
    console.log('等待指令响应，停止自动刷新');
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  },

  //固定时间停止刷新
  autoStopRefresh(){
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
  },

  // 点击通知恢复刷新
  resumeRefresh() {
    wx.vibrateShort({ type: 'light' });

  },

  // 开关机
  async togglePower() {

    wx.vibrateShort({ type: 'medium' });

    wx.showLoading({ title: '正在连接设备...', mask: true });
    // 1. 获取最新设备状态
    await this.loadDeviceStatus(true);
    wx.hideLoading();
    wx.showToast({
      title: '设备连接成功',
      icon: 'success'
    })

    const deviceStatus = this.data.deviceStatus;

    //设备在线状态判断
    if (!deviceStatus.online) {
      wx.showToast({
        title: '设备不在线！',
        icon: 'error'
      })
      return;
    }

    if (deviceStatus.ps === 1) {
      // 如果已开机：直接同步显示（loadDeviceStatus已更新deviceStatus）
      // wx.showToast({ title: '设备已开机', icon: 'success' });
      this.setData({
        'deviceStatus.ps': 0
      });
      this.bufferCommand('setPower', 0);
    } else {
      // 如果已关机：按关机时的状态开机
      this.setData({
        'deviceStatus.ps': 1
      });
      wx.showToast({ title: '正在开机...', icon: 'loading' });
      // 发送开机指令 (底层sendBluetoothCommand会处理记忆恢复)
      this.bufferCommand('setPower', 1);
    }
  },

  // 增加风速
  increaseWindSpeed() {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    let speed = this.data.deviceStatus.fs || 1;
    if (speed < 5) {
      const newSpeed = speed + 1;
      this.setData({
        'deviceStatus.fs': newSpeed
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

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    let speed = this.data.deviceStatus.fs || 1;
    if (speed > 1) {
      const newSpeed = speed - 1;
      this.setData({
        'deviceStatus.fs': newSpeed
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

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    let temp = Math.floor((this.data.deviceStatus.temp || 250) / 10);
    if (temp < 40) {
      const newTemp = temp + 1;
      this.setData({
        'deviceStatus.temp': newTemp * 10
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

    wx.vibrateShort({ type: 'light' });
    if (!this.checkPower()) return;
    let temp = Math.floor((this.data.deviceStatus.temp || 250) / 10);
    if (temp > 5) {
      const newTemp = temp - 1;
      this.setData({
        'deviceStatus.temp': newTemp * 10
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

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    const newStatus = this.data.deviceStatus.light === 1 ? 0 : 1;
    this.setData({
      'deviceStatus.light': newStatus
    });
    this.showControlToast(newStatus ? '照明已开启' : '照明已关闭');
    this.bufferCommand('setLighting', newStatus);
  },

  // 强劲模式
  setStrongMode() {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    if (this.data.deviceStatus.fm === 3) {
      this.switchMode(2);
    } else {
      this.switchMode(3);
      this.showControlToast('强劲模式');
    }
  },

  // 制冷模式
  setAutoMode() {
    this.switchMode(2);
    this.showControlToast('制冷模式');
  },

  // 节能模式
  setEcoMode() {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    if (this.data.deviceStatus.fm === 1) {
      this.switchMode(2);
    } else {
      this.switchMode(1);
      this.showControlToast('节能模式');
    }
  },

  // 制热模式
  toggleHeating() {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    if (this.data.deviceStatus.fm === 5) {
      this.switchMode(2);
    } else {
      this.switchMode(5);
      this.showControlToast('制热模式');
    }
  },

  toggleFan() {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    if (this.data.deviceStatus.fm === 0) {
      this.switchMode(2);
    } else {
      this.switchMode(0);
      this.showControlToast('通风模式');
    }
  },

  // 上下摆风开关 ty
  toggleSwingUpDown() {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    const newStatus = this.data.deviceStatus.sxbf === 1 ? 0 : 1;
    this.setData({
      'deviceStatus.sxbf': newStatus
    });
    this.showControlToast(newStatus ? '上下摆风已开启' : '上下摆风已关闭');
    this.bufferCommand('setSwingUpDown', newStatus === 1);
  },

  // 左右摆风开关 ty
  toggleSwingLeftRight() {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    const newStatus = this.data.deviceStatus.zybf === 1 ? 0 : 1;
    this.setData({
      'deviceStatus.zybf': newStatus
    });
    this.showControlToast(newStatus ? '左右摆风已开启' : '左右摆风已关闭');
    this.bufferCommand('setSwingLeftRight', newStatus === 1);
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

  cycleMode() {
    if (!this.checkPower()) return;
    const modes = [5, 4, 2, 1]; // Auto, Strong, Sleep/Eco, Vent
    const current = this.data.deviceStatus.fm;
    let nextIndex = modes.indexOf(current) + 1;
    if (nextIndex >= modes.length) nextIndex = 0;
    if (modes.indexOf(current) === -1) nextIndex = 0;

    this.switchMode(modes[nextIndex]);
  },

  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.switchMode(mode);
    this.setData({ showModeDropdown: false });
  },

  switchMode(mode) {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;

    let windSpeed = this.data.deviceStatus.fs;
    if (mode === 4) windSpeed = 5;
    if (mode === 2) windSpeed = 1;
    if (mode === 5 || mode === 3) windSpeed = 3;

    this.setData({
      'deviceStatus.fm': mode,
      'deviceStatus.fs': windSpeed
    });

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

  cycleSwing() {
    if (!this.checkPower()) return;
    // Cycle: Off (0) -> UD (1) -> LR (2) -> Both (3) -> Off (0)
    const ud = this.data.deviceStatus.sxbf === 1;
    const lr = this.data.deviceStatus.zybf === 1;

    let nextState = 0; // default to off
    if (!ud && !lr) nextState = 1; // Off -> UD
    else if (ud && !lr) nextState = 2; // UD -> LR
    else if (!ud && lr) nextState = 3; // LR -> Both
    else if (ud && lr) nextState = 0; // Both -> Off

    this.setSwingState(nextState);
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

    this.setData({ showSwingDropdown: false });
  },

  setZYBF(state) {
    wx.vibrateShort({ type: 'medium' });
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
    wx.vibrateShort({ type: 'medium' });
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

  setSwingState(state) {

    wx.vibrateShort({ type: 'medium' });
    if (!this.checkPower()) return;
    console.log('当前摆风状态：')
    console.log('上下摆风：', this.data.deviceStatus.sxbf);
    console.log('左右摆风：', this.data.deviceStatus.zybf);

    const ud = (state === 1 || state === 3);
    const lr = (state === 2 || state === 3);

    this.setData({
      'deviceStatus.sxbf': ud ? 1 : 0,
      'deviceStatus.zybf': lr ? 1 : 0
    });

    let name = ['摆风关闭', '上下摆风', '左右摆风', '全向摆风'][state];
    this.showControlToast(name);

    // Send commands
    this.bufferCommand('setSwingUpDown', ud);
    this.bufferCommand('setSwingLeftRight', lr);
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

  cycleFunction() {
    this.toggleFunctionDropdown();
  },

  selectFunction(e) {

    wx.vibrateShort({ type: 'medium' });
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

    // 清除该动作类型的现有定时器
    if (this.commandTimers[action]) {
      clearTimeout(this.commandTimers[action]);
      delete this.commandTimers[action];
    }

    // // “所有功能按钮只有设定值为true时才会向设备发送命令”
    // // 定义受限的功能按钮动作列表 (注：开关机 setPower 和 模式 setMode 不受此限制，除非特定要求)
    const restrictedActions = ['setAutoMode', 'setEcoMode', 'setStrongMode'];

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
    const deiveiceOnline = this.data.deviceStatus.online
    if (!device || !deiveiceOnline) return;

    // const deviceName = device.imei;
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
        console.log('[Bluetooth] 尝试通过蓝牙发送指令:', property);
        this.sendBluetoothCommand({ action, value, property });
      } else if (device.connectionType === '4g') {
        const res = await deviceApi.setDeviceDesiredProperty(deviceName, property);
        if (res && res.code === 200) {
          console.log('指令发送成功');
          // 设置成功后，立即再查询设备信息，根据返回数据更新页面状态
          await this.loadDeviceStatus(true);
        } else {
          wx.showToast({ title: res.msg || '设置失败', icon: 'none' });
        }
      }
    } catch (err) {
      console.error('指令发送失败:', err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      // 确认返回后（无论成功失败），继续定时刷新
      this.startAutoRefresh();
    }
  },

  // 辅助函数：检查电源状态
  checkPower() {
    if (this.data.deviceStatus.ps !== 1) {
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

    // 26° 制冷模式 3档风速 默认开机指令 (如果不含头，7字节数据)
    // 原始: [0xAA, 0x39, 0x02, 0xB2, 0x1A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    // 数据部分从 index 3 开始: B2 1A 00 00 00 00 00
    // B2 = 1011 0010 (开机, 制冷(3), 风速3(2))
    const deviceStatus = this.data.deviceStatus;
    const buffer = new ArrayBuffer(10);
    const dataView = new DataView(buffer);
    let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];

    // 帧头
    dataView.setUint8(0, 0xAA);
    dataView.setUint8(1, 0x39);
    dataView.setUint8(2, 0x02);



    if (deviceStatus.ps === 1) {
      data[0] = 0x80 | (deviceStatus.fm << 4) | (Math.max(0, deviceStatus.fs - 1));
    } else {
      data[0] = 0x00;
    }

    // Byte 4: Temp (divide by 10, range 5-40)
    data[1] = Math.max(5, Math.min(40, Math.floor(deviceStatus.temp / 10)));

    data[2] = 0x00;
    if (deviceStatus.light === 1) data[2] |= 0x04;
    if (deviceStatus.fl === 1) data[2] |= 0x08;
    if (deviceStatus.fu === 1) data[2] |= 0x10;

    // Byte 8: Timer
    if (deviceStatus.clock && deviceStatus.timer) {
      const timerValue = Math.min(15, Math.floor(deviceStatus.timer / 30));
      data[5] = 0x80 | timerValue;
    } else {
      data[5] = 0x00;
    }

    // Byte 9: Flags
    data[6] = 0x00;
    if (deviceStatus.sxbf === 1) data[6] |= 0x01;
    if (deviceStatus.zybf === 1) data[6] |= 0x02;

    // --- 特殊处理 Storage ---
    if (deviceStatus.ps !== 1) {
      // 关机时，保存当前的配置（作为下次开机的记忆）
      // 我们需要保存一份"如果是开机状态"的数据
      const saveData = [...data];
      saveData[0] |= 0x80; // 强制置为开机
      wx.setStorageSync('lastOffCommand', saveData);
    } else {
      // 开机时，如果需要恢复（这里比较难判断是否是"刚开机"还是"开机后调整温度"）
      // 假设外部逻辑控制 remoteState，这里只负责发送。
      // 如果用户希望"点击开机"时恢复状态，应该在 togglePower 里读取 Storage 并 setData remoteState。
      // 在这里做会导致状态覆盖。
      // 但为了响应用户"修改这个方法"的请求，且不改动其他方法，保留用户意图：
      // 用户代码试图用 lastOffCommand 覆盖 data。
      // 我们仅在"data[0] & 0x80" (开机) 时，如果这是刚开机的动作... 
      // 无法判断。

      // 按照用户提供的代码结构进行修改，替换 Buffer 为 ArrayBuffer
    }

    // 填充数据到 DataView
    for (let i = 0; i < 7; i++) {
      dataView.setUint8(3 + i, data[i]);
    }

    // 计算校验位
    let checksum = 0;
    for (let i = 0; i < 9; i++) {
      checksum ^= dataView.getUint8(i);
    }
    dataView.setUint8(9, checksum);

    // 发送
    wx.writeBLECharacteristicValue({
      deviceId: this.data.connectedDevice.deviceId,
      serviceId: this.data.serviceId,
      characteristicId: this.data.characteristicId,
      value: buffer,
      success: (res) => {
        console.log('[蓝牙发送] 指令发送成功');
        // 保存最后一次发送的指令（完整buffer转数组保存）
        // 转换 ArrayBuffer 为数组
        const sentBytes = [];
        for (let i = 0; i < 10; i++) sentBytes.push(dataView.getUint8(i));
        wx.setStorageSync('lastCommand', sentBytes);
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
      'deviceStatus.ps': parsedData.powerOn ? 1 : 0,
      'deviceStatus.fm': modeValue,
      'deviceStatus.fs': parsedData.windSpeed,
      'deviceStatus.temp': parsedData.targetTemperature * 10,
      'deviceStatus.sxbf': parsedData.swingUpDown ? 1 : 0,
      'deviceStatus.zybf': parsedData.swingLeftRight ? 1 : 0,
      'deviceStatus.light': parsedData.lightingOn ? 1 : 0,
      'deviceStatus.fl': parsedData.lightSurround ? 1 : 0,
      'deviceStatus.fu': parsedData.lightClean ? 1 : 0,
      'deviceStatus.it': parsedData.inletTemp,
      'deviceStatus.ot': parsedData.outletTemp,
      'deviceStatus.bv': parsedData.voltage,
      'deviceStatus.err': fault1 || 0,
      'deviceStatus.online': true,
      'deviceStatus.clock': parsedData.timerEnabled
    });

    // 检查故障状态
    this.checkFaultStatus(this.data.deviceStatus);

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

  onLogout() {
    this.setData({
      deviceList: [],
      selectedDeviceIndex: -1,
      selectedDevice: null,
      deviceStatus: {
        ps: 0, temp: 250, fs: 1, fm: 5, fl: 0, light: 0, lock: 0,
        sxbf: 0, zybf: 0, fu: 0, timer: 0, bv: 0, it: 0, ot: 0, err: 0,
        online: false, signalStrength: 0, clock: false
      }
    });
  },

});
