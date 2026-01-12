// pages/update/update.js
const app = getApp();

Page({

  /**
   * 页面的初始数据
   */
  data: {
    devices: [],
    deviceIndex: 0,
    currentDevice: null,
    isChecking: false,
    updateProgress: 0,
    showProgress: false,
    isBluetoothMode: false, // 标记当前是否为蓝牙模式
    btStatus: '未连接', // 蓝牙连接状态

    // OTA 升级相关
    totalPackets: 0,
    currentPacketIndex: 0,
    upgradeFileBuffer: null,
    isUpgrading: false,
    upgradePackets: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadCachedDevices();
  },

  onUnload() {
    // 页面卸载时停止监听
    this.stopUpdateListener();
  },

  /**
   * 从缓存加载设备列表
   */
  loadCachedDevices() {
    const myProductsList = wx.getStorageSync('myProductsList') || [];
    const savedBTDevices = wx.getStorageSync('savedBTDevices') || [];

    const combinedList = [...myProductsList, ...savedBTDevices].map(device => {
      return {
        ...device,
        name: device.name || (device.connectionType === 'bluetooth' ? '蓝牙设备' : '4G设备'),
        sn: device.sn || device.imei || '未知序列号',
        hwVersion: device.hwVersion || 'V1.0.0',
        swVersion: device.swVersion || 'V2.1.0'
      };
    });

    if (combinedList.length > 0) {
      const initialDevice = combinedList[0];
      this.setData({
        devices: combinedList,
        currentDevice: initialDevice,
        deviceIndex: 0,
        isBluetoothMode: initialDevice.connectionType === 'bluetooth'
      });

      if (initialDevice.connectionType === 'bluetooth') {
        const isActuallyConnected = app.globalData.isBluetoothConnected && app.globalData.bleDeviceId === initialDevice.deviceId;
        this.setData({
          btStatus: isActuallyConnected ? '已连接' : '未连接'
        });
        this.getBluetoothVersion(initialDevice);
      }
    } else {
      this.setData({
        devices: [{ name: '未发现已绑定设备', sn: '-', hwVersion: '-', swVersion: '-' }],
        currentDevice: { name: '未发现已绑定设备', sn: '-', hwVersion: '-', swVersion: '-' }
      });
    }
  },

  /**
   * 设备切换
   */
  onDeviceChange(e) {
    const index = e.detail.value;
    const device = this.data.devices[index];
    this.setData({
      deviceIndex: index,
      currentDevice: device,
      isBluetoothMode: device.connectionType === 'bluetooth'
    });

    if (device.connectionType === 'bluetooth') {
      this.getBluetoothVersion(device);
    }
  },

  /**
   * 获取蓝牙设备版本号
   */
  getBluetoothVersion(device) {
    console.log('正在获取蓝牙设备版本信息...', device.name);
    this.setData({ btStatus: '正在查询版本...' });

    // 检查全局连接状态
    const isActuallyConnected = app.globalData.isBluetoothConnected && app.globalData.bleDeviceId === device.deviceId;

    if (isActuallyConnected) {
      this.setData({ btStatus: '已连接' });
    } else {
      this.setData({ btStatus: '未连接 (请在首页连接)' });
    }
  },

  /**
   * 检查版本更新 (4G模式)
   */
  onAutoUpdate() {
    if (this.data.isBluetoothMode) {
      wx.showModal({
        title: '提示',
        content: '当前为蓝牙连接设备，请使用“手动升级”功能。',
        showCancel: false
      });
      return;
    }
    this.setData({ isChecking: true });
    // TODO: 调用后端接口查询 4G 设备版本
    setTimeout(() => {
      this.setData({ isChecking: false });
      wx.showModal({
        title: '云端发现新版本',
        content: '检测到 V2.6.0 可用。\n是否开始远程升级？',
        confirmText: '开始升级',
        success: (res) => {
          if (res.confirm) {
            this.startSimulatedUpgrade('cloud');
          }
        }
      });
    }, 1500);
  },

  /**
   * 手动升级入口 (蓝牙直连升级)
   */
  onManualUpdate() {
    console.log('--- onManualUpdate Triggered ---');
    console.log('Current isBluetoothMode status:', this.data.isBluetoothMode);

    // 兼容可能存在的非布尔值情况
    const isBT = !!this.data.isBluetoothMode;

    if (!isBT) {
      console.log('Device is NOT in Bluetooth mode. Showing warning modal.');
      wx.showModal({
        title: '操作提示',
        content: '手动升级主要用于蓝牙OTA。当前设备为4G连接，请使用“自动检查并升级”。',
        showCancel: false,
        success: (res) => {
          console.log('4G Warning modal callback:', res);
        },
        fail: (err) => {
          console.error('4G Warning modal call failed:', err);
        }
      });
      return;
    }

    console.log('Device IS in Bluetooth mode. Showing confirmation modal.');
    // 使用 setTimeout 确保在下一帧执行，避免可能的 UI 冲突
    setTimeout(() => {
      wx.showModal({
        title: '升级前确认',
        content: '手动升级需要通过蓝牙连接设备。请确保蓝牙已开启并靠近设备。',
        confirmText: '选择文件',
        cancelText: '取消',
        success: (res) => {
          console.log('BT Confirm modal callback:', res);
          if (res.confirm) {
            console.log('User confirmed. Launching file picker...');
            this.chooseUpgradeFile();
          } else {
            console.log('User cancelled manual update.');
          }
        },
        fail: (err) => {
          console.error('BT Confirm modal call failed:', err);
        }
      });
    }, 100);
  },

  /**
   * 从聊天记录选择升级包
   */
  chooseUpgradeFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['bin'], // 严格限制 .bin 文件
      success: (res) => {
        const file = res.tempFiles[0];
        if (!file.name.toLowerCase().endsWith('.bin')) {
          wx.showToast({ title: '请选择正确的 .bin 格式固件', icon: 'none' });
          return;
        }

        // 读取文件内容
        const fs = wx.getFileSystemManager();
        console.log(`[OTA] 准备读取文件: ${file.path}, 大小: ${file.size} bytes`);
        fs.readFile({
          filePath: file.path,
          success: (readRes) => {
            console.log(`[OTA] 文件读取成功, ArrayBuffer长度: ${readRes.data.byteLength}`);
            wx.showModal({
              title: '确认升级',
              content: `已加载固件：${file.name}\n大小：${(file.size / 1024).toFixed(2)} KB\n确认开始向设备推送？`,
              success: (confirmRes) => {
                if (confirmRes.confirm) {
                  this.prepareUpgradePackets(readRes.data);
                }
              }
            });
          },
          fail: (err) => {
            console.error('文件读取失败', err);
            wx.showToast({ title: '文件内容读取失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        console.log('用户取消文件选择', err);
      }
    });
  },

  /**
   * 准备升级数据包
   */
  prepareUpgradePackets(arrayBuffer) {
    const data = new Uint8Array(arrayBuffer);
    const packetSize = 128; // 每包128字节
    const totalPackets = Math.ceil(data.length / packetSize);
    const packets = [];

    console.log(`[OTA] 开始分包组帧: 总长度=${data.length}, 每包大小=${packetSize}, 总包数=${totalPackets}`);

    for (let i = 0; i < totalPackets; i++) {
      const start = i * packetSize;
      const end = Math.min(start + packetSize, data.length);
      const chunk = new Uint8Array(packetSize);
      chunk.set(data.slice(start, end));

      // 构建完整帧 140 字节
      const buffer = new ArrayBuffer(140);
      const view = new DataView(buffer);

      // 帧头
      view.setUint8(0, 0xAA);
      view.setUint8(1, 0x55);
      // 总数 (小端)
      view.setUint16(2, totalPackets, true);
      // 序号 (小端)
      view.setUint16(4, i + 1, true);
      // 长度 (小端) 0x80 = 128
      view.setUint16(6, packetSize, true);
      // 数据
      for (let j = 0; j < packetSize; j++) {
        view.setUint8(8 + j, chunk[j]);
      }
      // 计算校验
      const checkData = new Uint8Array(buffer, 2, 134);
      const crc = this.calculateCRC16(checkData);
      view.setUint16(136, crc, true);
      // 帧尾
      view.setUint8(138, 0xCC);
      view.setUint8(139, 0x33);

      packets.push(buffer);

      // 仅打印前两包和最后一包的调试信息，避免日志过载
      if (i === 0 || i === totalPackets - 1) {
        let hex = Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`[OTA] 帧构造完成 - 序号:${i + 1}/${totalPackets}, 长度:${buffer.byteLength}, HEX前10位:${hex.substring(0, 29)}...`);
      }
    }

    console.log(`[OTA] 所有数据包就绪: 共计 ${packets.length} 个 140字节帧`);

    this.setData({
      upgradePackets: packets,
      totalPackets: totalPackets,
      currentPacketIndex: 0,
      isUpgrading: true,
      showProgress: true,
      updateProgress: 0
    });

    this.startBluetoothUpdate();
  },

  /**
   * 开始蓝牙升级流程
   */
  startBluetoothUpdate() {
    // 监听设备回复
    this.initUpdateListener();

    // 发送第一包
    this.sendSinglePacket(0);
  },

  /**
   * 发送单包数据
   */
  sendSinglePacket(index) {
    const packet = this.data.upgradePackets[index];
    const device = this.data.currentDevice;

    if (!device || !device.deviceId) {
      this.cancelUpgrade('找不到选中的蓝牙设备信息');
      return;
    }

    // 优先使用全局存储的已发现 ID，如果没有则 fallback 到缓存或默认值
    const serviceId = app.globalData.bleServiceId || wx.getStorageSync('bleServiceId') || '0000FF00-0000-1000-8000-00805F9B34FB';
    const characteristicId = app.globalData.bleWriteCharId || wx.getStorageSync('bleWriteCharId') || '0000FF01-0000-1000-8000-00805F9B34FB';

    console.log(`[OTA] 使用通道: Device=${device.deviceId}, Service=${serviceId}, Char=${characteristicId}`);

    console.log(`[OTA] 准备发送 -> 第 ${index + 1} 包, 目标设备: ${device.deviceId}`);

    wx.writeBLECharacteristicValue({
      deviceId: device.deviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: packet,
      success: (res) => {
        console.log(`[OTA] 发送成功 - 第 ${index + 1} 包交付给蓝牙栈`);
      },
      fail: (err) => {
        console.error(`[OTA] 发送失败 - 第 ${index + 1} 包报错:`, err);
        this.cancelUpgrade('数据写失败，请检查蓝牙连接');
      }
    });
  },

  /**
   * 初始化升级监听器
   */
  initUpdateListener() {
    wx.onBLECharacteristicValueChange((res) => {
      this.handleBluetoothResponse(res.value);
    });
  },

  stopUpdateListener() {
    // 官方没有 offBLECharacteristicValueChange，通常在 onUnload 统一处理
  },

  /**
   * 处理蓝牙回复数据
   */
  handleBluetoothResponse(buffer) {
    if (!this.data.isUpgrading) return;

    const view = new DataView(buffer);

    // 校验回复帧头 5A A5
    if (view.getUint8(0) !== 0x5A || view.getUint8(1) !== 0xA5) {
      console.warn('收到非标准回复帧');
      return;
    }

    // 序号 L/H
    const index = view.getUint16(4, true);
    // 状态位
    const status = view.getUint8(6);

    console.log(`[OTA] 收到回复: 对应序号=${index}, 状态码=${status} (${status === 1 ? '成功' : '失败'})`);

    if (status === 1) {
      // 成功，发送下一包
      console.log(`设备确认收到第 ${index} 包`);
      const nextIndex = this.data.currentPacketIndex + 1;

      if (nextIndex < this.data.totalPackets) {
        this.setData({
          currentPacketIndex: nextIndex,
          updateProgress: Math.floor((nextIndex / this.data.totalPackets) * 100)
        });
        this.sendSinglePacket(nextIndex);
      } else {
        // 全部完成
        this.setData({ updateProgress: 100 });
        this.finishUpgrade();
      }
    } else {
      // 失败
      this.cancelUpgrade(`设备在接收第 ${index} 包时报错，请重试`);
    }
  },

  /**
   * 用户点击取消升级
   */
  onUserCancelUpgrade() {
    wx.showModal({
      title: '温馨提示',
      content: '确定要中止当次升级过程吗？',
      confirmText: '确定中止',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          console.log('[OTA] 用户手动中止了升级流程');
          this.cancelUpgrade('用户已手动取消升级');
        }
      }
    });
  },

  /**
   * 终止升级
   */
  cancelUpgrade(reason) {
    this.setData({
      isUpgrading: false,
      showProgress: false
    });
    wx.showModal({
      title: '升级中断',
      content: reason,
      showCancel: false
    });
  },

  /**
   * CRC16 校验逻辑 (Modbus/Common standard)
   */
  calculateCRC16(uint8Array) {
    let crc = 0xFFFF;
    for (let i = 0; i < uint8Array.length; i++) {
      crc ^= uint8Array[i];
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x0001) !== 0) {
          crc = (crc >> 1) ^ 0xA001;
        } else {
          crc = crc >> 1;
        }
      }
    }
    return crc;
  },

  /**
   * 模拟的升级过程 (用于4G模式或离线演示)
   */
  startSimulatedUpgrade(type) {
    this.setData({
      showProgress: true,
      updateProgress: 0
    });
    const timer = setInterval(() => {
      let step = type === 'bluetooth' ? 3 : 5;
      let progress = this.data.updateProgress + Math.floor(Math.random() * step) + 2;
      if (progress >= 100) {
        progress = 100;
        clearInterval(timer);
        this.finishUpgrade();
      }
      this.setData({ updateProgress: progress });
    }, 500);
  },

  finishUpgrade() {
    setTimeout(() => {
      this.setData({
        showProgress: false,
        isUpgrading: false
      });
      wx.showToast({
        title: '升级完成',
        icon: 'success'
      });

      const currentDevice = this.data.currentDevice;
      currentDevice.swVersion = 'V2.6.0 (最新)';
      this.setData({ currentDevice });
    }, 500);
  }
})