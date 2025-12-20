// pages/client/remote/remote.js
var timer = require("../../../utils/wxTimer")
Page({

  /**
   * 页面的初始数据
   */
  data: {
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
    ,
    // 定时弹窗相关
    showTimerModal: false,
    timerMinutes: 60 // 初始为 60 分钟，最小 60，最大 480，步长 30
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initDeviceSelection();
  },

  async initDeviceSelection() {
    const userInfo = wx.getStorageSync('userInfo');
    const savedImei = wx.getStorageSync('selectedDeviceImei');
    await this.getDeviceInfo(userInfo, savedImei);
  },

  onDeviceChange(e) {
    const index = e.detail.value;
    const device = this.data.deviceList[index];
    this.setData({
      selectedDeviceIndex: index,
      selectedDevice: device
    });
    wx.setStorageSync('selectedDeviceImei', device.imei);
    wx.showToast({
      title: `已切换至 ${device.sn || '新设备'}`,
      icon: 'none'
    });
    // 切换设备后可能需要重新加载状态
    this.loadDeviceStatus();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {

  },

  async timerTests() {
    // 打开定时弹窗（前端部分）
    this.setData({
      showTimerModal: true,
      timerMinutes: 60 // 每次打开默认 1 小时
    });
  },

  // 增减定时（步长 30 分钟），限制在 60 - 480
  changeTimer(e) {
    const delta = parseInt(e.currentTarget.dataset.delta, 10) || 0;
    let m = this.data.timerMinutes + delta;
    if (m < 60) m = 60;
    if (m > 480) m = 480;
    this.setData({ timerMinutes: m });
  },

  closeTimerModal() {
    this.setData({ showTimerModal: false });
  },

  async confirmTimer() {
    const minutes = this.data.timerMinutes;
    // 这里留空供你实现云函数调用：例如 wx.cloud.callFunction({...})
    // 我目前只做前端处理：关闭弹窗并提示
    this.setData({ showTimerModal: false });
    wx.showToast({ title: `已设置定时 ${this.formatTimer(minutes)}`, icon: 'none' });

    // 占位：调用云函数发送定时指令（请替换为你自己的实现）
    // await wx.cloud.callFunction({
    //   name: 'your-timer-fn',
    //   data: { action: 'setTimer', device: this.data.selectedDevice, minutes }
    // })
  },

  // 辅助：页面表达式中无法直接调用复杂函数，这是用于 WXML 显示
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
      // 这里可以调用云函数获取真实设备状态
      const device = this.data.deviceList[index];
      const result = wx.cloud.callFunction({
        name: 'onenet',
        data: {
          action: 'getDviceStatus',
          deviceName: device.imei
        }
      })
      console.log("设备状态返回", result.message);
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

  // --- 遥控器控制逻辑 ---

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
      // this.showControlToast('已开机');
    } else {
      wx.showToast({
        title: '开机失败',
        icon: 'error',
        duration: 2000
      });
      // this.showControlToast("开机失败");
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
    // 如果当前是制热，则切换回自动，否则切换到制热
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

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  }
})