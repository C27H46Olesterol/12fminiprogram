// pages/admin/user-management/user-management.js
Page({
  data: {
    users: [],
    filteredUsers: [],
    loading: true,
    submitting: false,
    searchKeyword: '',
    selectedRole: 'all',
    selectedRoleText: '全部角色',
    roles: [
      { value: 'all', label: '全部角色' },
      { value: 'client', label: '客户' },
      { value: 'manager', label: '主管' },
      { value: 'worker', label: '维修工' },
      { value: 'admin', label: '系统管理员' }
    ],
    // 地域筛选 - 自定义弹窗
    showRegionModal: false,
    selectedRegion: '',
    selectedRegionText: '全部地域',
    workerRegions: [], // 所有维修工的注册地区（去重）
    filteredWorkerRegions: [], // 搜索过滤后的地区列表
    regionSearchKeyword: '',
    // 位置信息
    myLocation: null,
    stats: {
      total: 0,
      client: 0,
      manager: 0,
      worker: 0,
      admin: 0
    }
  },

  onLoad() {
    console.log('🔧 超级管理员页面加载');
    this.checkPermission();
    this.loadUsers();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadUsers();
  },

  /**
   * 检查权限
   */
  checkPermission() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('👤 当前用户信息:', userInfo);
    
    if (!userInfo || userInfo.role !== 'admin') {
      console.error('❌ 权限不足，非管理员用户');
      wx.showModal({
        title: '权限不足',
        content: '您没有访问此页面的权限',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return false;
    }
    return true;
  },

  /**
   * 加载用户列表
   */
  async loadUsers() {
    try {
      this.setData({ loading: true });
      console.log('📋 开始加载用户列表...');

      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo');
      console.log('📱 当前用户信息:', userInfo);

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getAllUsers',
          phoneNumber: userInfo?.phoneNumber || userInfo?.phone,
          userId: userInfo?.userId
        }
      });

      console.log('✅ 用户列表加载结果:', result);

      if (result.result && result.result.success) {
        const users = result.result.data || [];
        
        // 处理用户数据
        const processedUsers = users.map((user) => {
          return {
            ...user,
            createTimeText: this.formatTime(user.createTime),
            // 如果没有头像，使用空字符串，让CSS处理默认显示
            avatarUrl: user.avatarUrl || '',
            // region 字段已由云函数处理，直接使用
            region: user.region || ''
          };
        });

        // 计算统计信息
        const stats = this.calculateStats(processedUsers);

        // 提取维修工的注册地区（去重）
        const workerRegions = [];
        processedUsers.forEach(user => {
          if (user.role === 'worker' && user.region) {
            if (!workerRegions.includes(user.region)) {
              workerRegions.push(user.region);
            }
          }
        });
        // 排序
        workerRegions.sort();

        this.setData({
          users: processedUsers,
          filteredUsers: processedUsers,
          stats: stats,
          workerRegions: workerRegions,
          filteredWorkerRegions: workerRegions,
          loading: false
        });

        console.log('📊 用户统计:', stats);
        console.log('📍 维修工地区:', workerRegions);
      } else {
        throw new Error(result.result?.message || '加载用户列表失败');
      }
    } catch (error) {
      console.error('❌ 加载用户列表失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    }
  },

  /**
   * 计算统计信息
   */
  calculateStats(users) {
    const stats = {
      total: users.length,
      client: 0,
      manager: 0,
      worker: 0,
      admin: 0
    };

    users.forEach(user => {
      if (stats.hasOwnProperty(user.role)) {
        stats[user.role]++;
      }
    });

    return stats;
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp) {
    if (!timestamp) return '未知时间';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) { // 1分钟内
      return '刚刚';
    } else if (diff < 3600000) { // 1小时内
      return Math.floor(diff / 60000) + '分钟前';
    } else if (diff < 86400000) { // 1天内
      return Math.floor(diff / 3600000) + '小时前';
    } else if (diff < 2592000000) { // 30天内
      return Math.floor(diff / 86400000) + '天前';
    } else {
      return date.toLocaleDateString();
    }
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    this.filterUsers();
  },

  /**
   * 角色筛选
   */
  onRoleChange(e) {
    const index = e.detail.value;
    const role = this.data.roles[index];
    this.setData({
      selectedRole: role.value,
      selectedRoleText: role.label
    });
    this.filterUsers();
  },

  /**
   * 过滤用户
   */
  filterUsers() {
    const { users, searchKeyword, selectedRole, selectedRegion } = this.data;
    
    let filtered = users;

    // 角色筛选
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    // 地域筛选
    if (selectedRegion) {
      filtered = filtered.filter(user => {
        return user.region === selectedRegion;
      });
    }

    // 关键词搜索
    if (searchKeyword) {
      filtered = filtered.filter(user => {
        const nickname = user.nickname || '';
        const phone = user.phone || '';
        return nickname.includes(searchKeyword) || phone.includes(searchKeyword);
      });
    }

    this.setData({ filteredUsers: filtered });
  },

  /**
   * 显示地区选择弹窗
   */
  showRegionModal() {
    this.setData({
      showRegionModal: true,
      regionSearchKeyword: '',
      filteredWorkerRegions: this.data.workerRegions
    });
  },

  /**
   * 隐藏地区选择弹窗
   */
  hideRegionModal() {
    this.setData({
      showRegionModal: false,
      regionSearchKeyword: ''
    });
  },

  /**
   * 阻止事件冒泡
   */
  stopPropagation() {
    // 空函数，阻止点击弹窗内容时关闭弹窗
  },

  /**
   * 地区搜索输入
   */
  onRegionSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ regionSearchKeyword: keyword });

    if (!keyword) {
      this.setData({ filteredWorkerRegions: this.data.workerRegions });
      return;
    }

    // 过滤地区列表
    const filtered = this.data.workerRegions.filter(region => {
      return region.includes(keyword);
    });

    this.setData({ filteredWorkerRegions: filtered });
  },

  /**
   * 选择地区（临时选择）
   */
  selectRegion(e) {
    const region = e.currentTarget.dataset.region;
    this.setData({ selectedRegion: region });
  },

  /**
   * 确认地区选择
   */
  confirmRegion() {
    const region = this.data.selectedRegion;
    const regionText = region === '' ? '全部地域' : region;

    this.setData({
      selectedRegionText: regionText,
      showRegionModal: false,
      regionSearchKeyword: ''
    });

    this.filterUsers();
  },

  /**
   * 获取我的位置
   */
  getMyLocation() {
    wx.showLoading({ title: '获取位置中...' });
    
    wx.getLocation({
      type: 'gcj02',
      success: async (res) => {
        console.log('📍 获取位置成功:', res);
        
        // 先设置位置信息（显示"解析中..."）
        this.setData({
          myLocation: {
            latitude: res.latitude,
            longitude: res.longitude,
            address: '正在解析地址...'
          }
        });
        
        wx.hideLoading();
        
        // 异步解析地址
        await this.reverseGeocode(res.latitude, res.longitude);
        
        wx.showToast({
          title: '位置获取成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        console.error('❌ 获取位置失败:', err);
        wx.hideLoading();
        wx.showModal({
          title: '获取位置失败',
          content: '请确保已授权位置权限',
          showCancel: false
        });
      }
    });
  },

  /**
   * 逆地理编码（将经纬度转换为真实地址）
   * 优化版：使用微信小程序的 chooseLocation API
   */
  async reverseGeocode(latitude, longitude) {
    try {
      console.log('🔍 开始解析地址:', latitude, longitude);
      
      wx.showLoading({
        title: '解析地址中...',
        mask: true
      });
      
      // 方法1：尝试使用腾讯地图API（需要有效的Key）
      // 如果您有自己的腾讯地图Key，请替换下面的 YOUR_KEY_HERE
      const TENCENT_MAP_KEY = 'IGZBZ-HC26T-DQJXV-V5DXW-RTVRS-4MFWE'; // 腾讯地图 Key
      
      if (TENCENT_MAP_KEY !== 'YOUR_KEY_HERE') {
        try {
          const result = await this.callTencentMapAPI(latitude, longitude, TENCENT_MAP_KEY);
          if (result) {
            wx.hideLoading();
            wx.showToast({
              title: '位置获取成功',
              icon: 'success',
              duration: 1500
            });
            return;
          }
        } catch (apiError) {
          console.warn('⚠️ 腾讯地图API调用失败，使用备用方案:', apiError);
        }
      }
      
      // 方法2：使用简化的地址显示（备用方案）
      wx.hideLoading();
      
      // 根据经纬度大致判断区域
      const addressInfo = this.getApproximateAddress(latitude, longitude);
      
      this.setData({
        'myLocation.address': addressInfo.address,
        'myLocation.province': addressInfo.province,
        'myLocation.city': addressInfo.city,
        'myLocation.district': addressInfo.district
      });
      
      console.log('✅ 地址解析完成（备用方案）:', addressInfo.address);
      
      wx.showToast({
        title: '位置获取成功',
        icon: 'success',
        duration: 1500
      });
      
    } catch (error) {
      console.error('❌ 地址解析失败:', error);
      wx.hideLoading();
      
      // 最终备用方案：显示友好提示（不显示经纬度）
      const fallbackAddress = '位置已获取';
      this.setData({
        'myLocation.address': fallbackAddress,
        'myLocation.latitude': latitude,
        'myLocation.longitude': longitude
      });
      
      wx.showToast({
        title: '位置获取成功',
        icon: 'success',
        duration: 1500
      });
    }
  },

  /**
   * 调用腾讯地图API
   */
  async callTencentMapAPI(latitude, longitude, key) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          location: `${latitude},${longitude}`,
          key: key,
          get_poi: 1
        },
        method: 'GET',
        timeout: 8000,
        success: (res) => {
          console.log('📥 腾讯地图API响应:', res);
          
          if (res.statusCode === 200 && res.data && res.data.status === 0) {
            const addressData = res.data.result;
            const address = addressData.address;
            const adInfo = addressData.ad_info;
            
            this.setData({
              'myLocation.address': address,
              'myLocation.province': adInfo.province,
              'myLocation.city': adInfo.city,
              'myLocation.district': adInfo.district
            });
            
            console.log('✅ 腾讯地图解析成功:', address);
            resolve(res.data);
          } else {
            const errorMsg = res.data ? res.data.message : '未知错误';
            console.error('⚠️ API返回错误:', errorMsg);
            reject(new Error(errorMsg));
          }
        },
        fail: (err) => {
          console.error('❌ 请求失败:', err);
          reject(err);
        }
      });
    });
  },

  /**
   * 根据经纬度获取大致地址（备用方案）
   * 这是一个简化的地址解析，不依赖第三方API
   */
  getApproximateAddress(latitude, longitude) {
    // 中国主要城市的经纬度范围（简化版）
    const cityRanges = [
      { name: '北京市', province: '北京市', lat: [39.4, 41.1], lng: [115.4, 117.5] },
      { name: '上海市', province: '上海市', lat: [30.7, 31.5], lng: [120.8, 122.0] },
      { name: '广州市', province: '广东省', lat: [22.5, 23.9], lng: [112.9, 114.0] },
      { name: '深圳市', province: '广东省', lat: [22.4, 22.9], lng: [113.7, 114.6] },
      { name: '成都市', province: '四川省', lat: [30.0, 31.4], lng: [102.9, 104.9] },
      { name: '杭州市', province: '浙江省', lat: [29.2, 30.6], lng: [118.3, 120.9] },
      { name: '重庆市', province: '重庆市', lat: [28.1, 32.2], lng: [105.3, 110.2] },
      { name: '武汉市', province: '湖北省', lat: [29.9, 31.4], lng: [113.7, 115.1] },
      { name: '西安市', province: '陕西省', lat: [33.7, 34.8], lng: [107.4, 109.8] },
      { name: '郑州市', province: '河南省', lat: [34.2, 35.0], lng: [112.9, 114.4] },
      { name: '南京市', province: '江苏省', lat: [31.1, 32.6], lng: [118.3, 119.3] },
      { name: '天津市', province: '天津市', lat: [38.5, 40.3], lng: [116.7, 118.1] },
      { name: '苏州市', province: '江苏省', lat: [30.8, 32.0], lng: [119.5, 121.5] },
      { name: '长沙市', province: '湖南省', lat: [27.7, 28.6], lng: [111.9, 114.2] },
      { name: '沈阳市', province: '辽宁省', lat: [41.1, 42.2], lng: [122.3, 123.7] },
      { name: '青岛市', province: '山东省', lat: [35.4, 36.5], lng: [119.4, 121.1] },
      { name: '济南市', province: '山东省', lat: [36.0, 37.0], lng: [116.2, 117.8] },
      { name: '大连市', province: '辽宁省', lat: [38.4, 39.9], lng: [120.6, 123.5] },
      { name: '厦门市', province: '福建省', lat: [24.2, 24.7], lng: [117.8, 118.3] },
      { name: '宁波市', province: '浙江省', lat: [28.9, 30.2], lng: [120.8, 122.4] }
    ];
    
    // 查找匹配的城市
    for (const city of cityRanges) {
      if (latitude >= city.lat[0] && latitude <= city.lat[1] &&
          longitude >= city.lng[0] && longitude <= city.lng[1]) {
        return {
          province: city.province,
          city: city.name,
          district: '市辖区',
          address: `${city.province}${city.name}`
        };
      }
    }
    
    // 如果没有匹配到具体城市，返回大致区域
    let region = '中国';
    if (latitude > 40) region = '中国北方';
    else if (latitude > 30) region = '中国中部';
    else if (latitude > 20) region = '中国南方';
    
    return {
      province: region,
      city: '未知城市',
      district: '未知区域',
      address: region
    };
  },

  /**
   * 显示地图
   */
  showMap() {
    const { myLocation, filteredUsers } = this.data;
    
    if (!myLocation) {
      wx.showModal({
        title: '提示',
        content: '请先获取您的位置',
        showCancel: false
      });
      return;
    }

    // 准备地图标记点
    const markers = filteredUsers
      .filter(user => user.latitude && user.longitude)
      .map((user, index) => ({
        id: index,
        latitude: user.latitude,
        longitude: user.longitude,
        title: user.nickname || '用户',
        iconPath: '/images/marker.png',
        width: 30,
        height: 30
      }));

    // 打开地图选择位置
    wx.chooseLocation({
      latitude: myLocation.latitude,
      longitude: myLocation.longitude,
      success: (res) => {
        console.log('📍 选择位置:', res);
      },
      fail: (err) => {
        console.log('❌ 取消选择位置');
      }
    });
  },

  /**
   * 筛选维修工（已移除距离计算功能）
   */
  findNearbyWorkers() {
    const { users } = this.data;

    wx.showLoading({ title: '搜索中...' });

    // 严格筛选维修工 - 确保role完全等于'worker'
    let workers = users.filter(user => {
      console.log('🔍 检查用户:', user.nickname, 'role:', user.role);
      return user.role === 'worker';
    });
    
    console.log('✅ 筛选出的维修工数量:', workers.length);

    // 重要：更新筛选后的用户列表和角色筛选状态
    this.setData({
      filteredUsers: workers,
      selectedRole: 'worker',
      selectedRoleText: '维修工',
      // 重置地域筛选，避免地域筛选影响结果
      selectedProvince: '全部',
      selectedCity: '全部',
      selectedDistrict: '全部',
      selectedRegionText: '全部地域',
      regionValue: ['全部', '全部', '全部']
    });

    wx.hideLoading();

    if (workers.length === 0) {
      wx.showToast({
        title: '附近没有维修工',
        icon: 'none'
      });
    } else {
      wx.showToast({
        title: `找到${workers.length}位维修工`,
        icon: 'success'
      });
    }
  },


  /**
   * 修改用户角色
   */
  async changeUserRole(e) {
    const { userid, currentrole } = e.currentTarget.dataset;
    console.log('🔄 准备修改用户角色:', { userid, currentrole });

    const roles = [
      { value: 'client', label: '客户' },
      { value: 'manager', label: '主管' },
      { value: 'worker', label: '维修工' },
      { value: 'admin', label: '系统管理员' }
    ];

    wx.showActionSheet({
      itemList: roles.map(role => role.label),
      success: async (res) => {
        const newRole = roles[res.tapIndex].value;
        
        if (newRole === currentrole) {
          wx.showToast({
            title: '角色未改变',
            icon: 'none'
          });
          return;
        }

        // 确认修改
        wx.showModal({
          title: '确认修改',
          content: `确定要将用户角色修改为"${roles[res.tapIndex].label}"吗？`,
          success: async (modalRes) => {
            if (modalRes.confirm) {
              await this.updateUserRole(userid, newRole);
            }
          }
        });
      }
    });
  },

  /**
   * 更新用户角色
   */
  async updateUserRole(userId, newRole) {
    try {
      this.setData({ submitting: true });
      console.log('🔄 更新用户角色:', { userId, newRole });

      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo');

      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'updateUserRole',
          userId: userId,
          newRole: newRole,
          phoneNumber: userInfo?.phoneNumber || userInfo?.phone
        }
      });

      console.log('✅ 角色更新结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        
        // 显示详细更新信息
        let message = '角色更新成功';
        if (data && data.position) {
          message += `\n职位：${data.position}`;
        }
        
        wx.showModal({
          title: '✅ 更新成功',
          content: data ? 
            `角色：${this.getRoleText(data.newRole)}\n` +
            `职位：${data.position}\n` +
            `权限已同步更新` : 
            '用户角色、职位和权限已成功更新',
          showCancel: false,
          confirmText: '确定'
        });
        
        // 重新加载用户列表
        await this.loadUsers();
      } else {
        throw new Error(result.result?.message || '角色更新失败');
      }
    } catch (error) {
      console.error('❌ 角色更新失败:', error);
      wx.showToast({
        title: '更新失败',
        icon: 'error'
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /**
   * 头像加载失败
   */
  onAvatarError(e) {
    const index = e.currentTarget.dataset.index;
    const users = this.data.filteredUsers;
    // 设置为空字符串，让CSS显示默认头像
    users[index].avatarUrl = '';
    this.setData({ filteredUsers: users });
  },

  /**
   * 导航方法
   */
  goBack() {
    wx.navigateBack();
  },

  goToHome() {
    wx.switchTab({
      url: '/pages/client/index/index'
    });
  },

  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  goToSettings() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  /**
   * 获取角色中文文本
   */
  getRoleText(role) {
    const roleMap = {
      'client': '客户',
      'worker': '维修工',
      'manager': '主管',
      'admin': '超级管理员'
    };
    return roleMap[role] || role;
  }
});