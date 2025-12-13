// pages/worker/index/index.js
const app = getApp();
const amapFile = require('../../../utils/amap-wx.130.js');
Page({
  data: {
    userInfo: null,
    workerLocation: null, // 维修工的注册位置
    multiArray: [[], []], // 两列选择器：[省列表, 市列表]
    multiIndex: [0, 0], // 当前选中的索引
    provinceData: {}, // 省市数据映射
    // 自定义选择器相关
    showRegionModal: false, // 是否显示地区选择器
    provinceList: [], // 省份列表
    cityList: [], // 当前省份的城市列表
    selectedProvinceIndex: 0, // 选中的省份索引
    selectedCityIndex: 0, // 选中的城市索引
    searchKeyword: '', // 搜索关键词
    searchResults: [], // 搜索结果
    pendingTaskCount: 0, // 待处理任务数量
    taskOverview: {
      highPriority: 0,
      mediumPriority: 0,
      completed: 0
    },
    urgentTasks: [],
    recentTasks: [],
    todayStats: {
      completed: 0,
      inProgress: 0,
      rating: 0
    }
  },

  onLoad() {
    this.initRegionData();
    this.initPage();

    // 高德地图小程序SDK
    // const myAmapFun = new amapFile.AMapWX({ key: '60c0143458b12be642fc5385f9a4d70b' });
    // myAmapFun.getRegeo({
    //   success: function (data) {
    //     console.log('当前位置详细信息：', data[0].regeocodeData.addressComponent);
    //     const { province, city, district } = data[0].regeocodeData.addressComponent;
    //     console.log(`省: ${province}, 市: ${city}, 区: ${district}`);
    //   },
    //   fail: function (info) {
    //     console.error('获取位置失败：', info);
    //   }
    //   });
  },

  onShow() {
    this.loadTaskData();
  },

  // 初始化省市数据
  initRegionData() {
    const provinceData = {
      '北京市': ['全部', '东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'],
      '天津市': ['全部', '和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区'],
      '河北省': ['全部', '石家庄市', '唐山市', '秦皇岛市', '邯郸市', '邢台市', '保定市', '张家口市', '承德市', '沧州市', '廊坊市', '衡水市'],
      '山西省': ['全部', '太原市', '大同市', '阳泉市', '长治市', '晋城市', '朔州市', '晋中市', '运城市', '忻州市', '临汾市', '吕梁市'],
      '内蒙古自治区': ['全部', '呼和浩特市', '包头市', '乌海市', '赤峰市', '通辽市', '鄂尔多斯市', '呼伦贝尔市', '巴彦淖尔市', '乌兰察布市', '兴安盟', '锡林郭勒盟', '阿拉善盟'],
      '辽宁省': ['全部', '沈阳市', '大连市', '鞍山市', '抚顺市', '本溪市', '丹东市', '锦州市', '营口市', '阜新市', '辽阳市', '盘锦市', '铁岭市', '朝阳市', '葫芦岛市'],
      '吉林省': ['全部', '长春市', '吉林市', '四平市', '辽源市', '通化市', '白山市', '松原市', '白城市', '延边朝鲜族自治州'],
      '黑龙江省': ['全部', '哈尔滨市', '齐齐哈尔市', '鸡西市', '鹤岗市', '双鸭山市', '大庆市', '伊春市', '佳木斯市', '七台河市', '牡丹江市', '黑河市', '绥化市', '大兴安岭地区'],
      '上海市': ['全部', '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区'],
      '江苏省': ['全部', '南京市', '无锡市', '徐州市', '常州市', '苏州市', '南通市', '连云港市', '淮安市', '盐城市', '扬州市', '镇江市', '泰州市', '宿迁市'],
      '浙江省': ['全部', '杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '衢州市', '舟山市', '台州市', '丽水市'],
      '安徽省': ['全部', '合肥市', '芜湖市', '蚌埠市', '淮南市', '马鞍山市', '淮北市', '铜陵市', '安庆市', '黄山市', '滁州市', '阜阳市', '宿州市', '六安市', '亳州市', '池州市', '宣城市'],
      '福建省': ['全部', '福州市', '厦门市', '莆田市', '三明市', '泉州市', '漳州市', '南平市', '龙岩市', '宁德市'],
      '江西省': ['全部', '南昌市', '景德镇市', '萍乡市', '九江市', '新余市', '鹰潭市', '赣州市', '吉安市', '宜春市', '抚州市', '上饶市'],
      '山东省': ['全部', '济南市', '青岛市', '淄博市', '枣庄市', '东营市', '烟台市', '潍坊市', '济宁市', '泰安市', '威海市', '日照市', '临沂市', '德州市', '聊城市', '滨州市', '菏泽市'],
      '河南省': ['全部', '郑州市', '开封市', '洛阳市', '平顶山市', '安阳市', '鹤壁市', '新乡市', '焦作市', '濮阳市', '许昌市', '漯河市', '三门峡市', '南阳市', '商丘市', '信阳市', '周口市', '驻马店市'],
      '湖北省': ['全部', '武汉市', '黄石市', '十堰市', '宜昌市', '襄阳市', '鄂州市', '荆门市', '孝感市', '荆州市', '黄冈市', '咸宁市', '随州市', '恩施土家族苗族自治州'],
      '湖南省': ['全部', '长沙市', '株洲市', '湘潭市', '衡阳市', '邵阳市', '岳阳市', '常德市', '张家界市', '益阳市', '郴州市', '永州市', '怀化市', '娄底市', '湘西土家族苗族自治州'],
      '广东省': ['全部', '广州市', '韶关市', '深圳市', '珠海市', '汕头市', '佛山市', '江门市', '湛江市', '茂名市', '肇庆市', '惠州市', '梅州市', '汕尾市', '河源市', '阳江市', '清远市', '东莞市', '中山市', '潮州市', '揭阳市', '云浮市'],
      '广西壮族自治区': ['全部', '南宁市', '柳州市', '桂林市', '梧州市', '北海市', '防城港市', '钦州市', '贵港市', '玉林市', '百色市', '贺州市', '河池市', '来宾市', '崇左市'],
      '海南省': ['全部', '海口市', '三亚市', '三沙市', '儋州市', '五指山市', '琼海市', '文昌市', '万宁市', '东方市'],
      '重庆市': ['全部', '万州区', '涪陵区', '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙坡区', '南岸区', '北碚区', '綦江区', '大足区', '渝北区', '巴南区', '黔江区', '长寿区', '江津区', '合川区', '永川区', '南川区', '璧山区', '铜梁区', '潼南区', '荣昌区', '开州区', '梁平区', '武隆区'],
      '四川省': ['全部', '成都市', '自贡市', '攀枝花市', '泸州市', '德阳市', '绵阳市', '广元市', '遂宁市', '内江市', '乐山市', '南充市', '眉山市', '宜宾市', '广安市', '达州市', '雅安市', '巴中市', '资阳市', '阿坝藏族羌族自治州', '甘孜藏族自治州', '凉山彝族自治州'],
      '贵州省': ['全部', '贵阳市', '六盘水市', '遵义市', '安顺市', '毕节市', '铜仁市', '黔西南布依族苗族自治州', '黔东南苗族侗族自治州', '黔南布依族苗族自治州'],
      '云南省': ['全部', '昆明市', '曲靖市', '玉溪市', '保山市', '昭通市', '丽江市', '普洱市', '临沧市', '楚雄彝族自治州', '红河哈尼族彝族自治州', '文山壮族苗族自治州', '西双版纳傣族自治州', '大理白族自治州', '德宏傣族景颇族自治州', '怒江傈僳族自治州', '迪庆藏族自治州'],
      '西藏自治区': ['全部', '拉萨市', '日喀则市', '昌都市', '林芝市', '山南市', '那曲市', '阿里地区'],
      '陕西省': ['全部', '西安市', '铜川市', '宝鸡市', '咸阳市', '渭南市', '延安市', '汉中市', '榆林市', '安康市', '商洛市'],
      '甘肃省': ['全部', '兰州市', '嘉峪关市', '金昌市', '白银市', '天水市', '武威市', '张掖市', '平凉市', '酒泉市', '庆阳市', '定西市', '陇南市', '临夏回族自治州', '甘南藏族自治州'],
      '青海省': ['全部', '西宁市', '海东市', '海北藏族自治州', '黄南藏族自治州', '海南藏族自治州', '果洛藏族自治州', '玉树藏族自治州', '海西蒙古族藏族自治州'],
      '宁夏回族自治区': ['全部', '银川市', '石嘴山市', '吴忠市', '固原市', '中卫市'],
      '新疆维吾尔自治区': ['全部', '乌鲁木齐市', '克拉玛依市', '吐鲁番市', '哈密市', '昌吉回族自治州', '博尔塔拉蒙古自治州', '巴音郭楞蒙古自治州', '阿克苏地区', '克孜勒苏柯尔克孜自治州', '喀什地区', '和田地区', '伊犁哈萨克自治州', '塔城地区', '阿勒泰地区'],
      '台湾省': ['全部', '台北市', '新北市', '桃园市', '台中市', '台南市', '高雄市'],
      '香港特别行政区': ['全部', '中西区', '湾仔区', '东区', '南区', '油尖旺区', '深水埗区', '九龙城区', '黄大仙区', '观塘区', '荃湾区', '屯门区', '元朗区', '北区', '大埔区', '西贡区', '沙田区', '葵青区', '离岛区'],
      '澳门特别行政区': ['全部', '澳门半岛', '氹仔', '路环']
    };

    const provinces = Object.keys(provinceData);
    const cities = provinceData[provinces[0]];

    this.setData({
      provinceData: provinceData,
      multiArray: [provinces, cities],
      multiIndex: [0, 0],
      provinceList: provinces,
      cityList: cities
    });
  },

  // 初始化页面
  initPage() {
    const userInfo = app.globalData.userInfo;
    if (!userInfo) {
      app.logout();
      return;
    }
    
    this.setData({ userInfo });
    
    // 加载维修工的位置信息
    this.loadWorkerLocation();
  },

  // 加载维修工的位置信息
  async loadWorkerLocation() {
    try {
      const userInfo = wx.getStorageSync('userInfo') || {};
      console.log('🔍 开始加载地区信息，userInfo:', userInfo);
      
      // 先尝试从本地存储读取地区信息
      if (userInfo.region) {
        // 处理 region 格式，只显示省-市
        let displayRegion = userInfo.region || '';
        const parts = displayRegion.split('-');
        const province = parts[0] || '';
        const city = parts[1] || '';
        displayRegion = `${province}-${city}`;
        
        // 查找省市在选择器中的索引
        const provinces = this.data.multiArray[0];
        const provinceIndex = provinces.indexOf(province);
        let cityIndex = 0;
        
        if (provinceIndex >= 0 && this.data.provinceData[province]) {
          const cities = this.data.provinceData[province];
          cityIndex = cities.indexOf(city);
          if (cityIndex < 0) cityIndex = 0;
        }
        
        this.setData({
          workerLocation: {
            region: displayRegion
          },
          multiIndex: [provinceIndex >= 0 ? provinceIndex : 0, cityIndex],
          multiArray: [provinces, provinceIndex >= 0 ? this.data.provinceData[province] : this.data.provinceData[provinces[0]]]
        });
        console.log('📍 从本地存储加载地区信息成功:', this.data.workerLocation);
        return;
      }
      
      // 如果本地没有位置信息，则从数据库读取
      const userId = userInfo.userId || userInfo._id;
      const token = wx.getStorageSync('token');
      
      if (!userId || !token) {
        console.log('⚠️ 未找到用户信息，无法加载位置信息');
        // 尝试获取当前位置
        this.getCurrentLocation();
        return;
      }
      
      // 调用云函数获取用户信息（包括位置）
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'getUserInfo',
          userId: userId,
          token: token
        }
      });
      
      if (result.result && result.result.success) {
        const userData = result.result.data;
        
        // 如果有地区信息，则显示
        if (userData.region) {
          // 处理 region 格式，只显示省-市
          let displayRegion = userData.region || '';
          const parts = displayRegion.split('-');
          const province = parts[0] || '';
          const city = parts[1] || '';
          displayRegion = `${province}-${city}`;
          
          // 查找省市在选择器中的索引
          const provinces = this.data.multiArray[0];
          const provinceIndex = provinces.indexOf(province);
          let cityIndex = 0;
          
          if (provinceIndex >= 0 && this.data.provinceData[province]) {
            const cities = this.data.provinceData[province];
            cityIndex = cities.indexOf(city);
            if (cityIndex < 0) cityIndex = 0;
          }
          
          this.setData({
            workerLocation: {
              region: displayRegion
            },
            multiIndex: [provinceIndex >= 0 ? provinceIndex : 0, cityIndex],
            multiArray: [provinces, provinceIndex >= 0 ? this.data.provinceData[province] : this.data.provinceData[provinces[0]]]
          });
          
          // 更新本地存储
          const updatedUserInfo = {
            ...userInfo,
            region: userData.region || ''
          };
          wx.setStorageSync('userInfo', updatedUserInfo);
          
          console.log('📍 从数据库加载地区信息成功:', this.data.workerLocation);
        } else {
          console.log('⚠️ 该维修工暂无地区信息，尝试获取当前位置');
          // 如果数据库也没有地区信息，则获取当前位置
          this.getCurrentLocation();
        }
      }
    } catch (error) {
      console.error('❌ 加载维修工位置信息失败:', error);
      // 出错时也尝试获取当前位置
      this.getCurrentLocation();
    }
  },

  // 获取当前位置
  async getCurrentLocation() {
    try {
      console.log('📍 开始获取当前位置...');
      
      wx.getLocation({
        type: 'gcj02',
        success: async (res) => {
          console.log('📍 位置获取成功:', res);
          
          // 调用逆地理编码获取地址（仅用于获取地区，不保存经纬度）
          const addressInfo = await this.reverseGeocode(res.latitude, res.longitude);
          
          // 处理 region 格式，只显示省-市
          let displayRegion = addressInfo.region || '';
          const parts = displayRegion.split('-');
          const province = parts[0] || '';
          const city = parts[1] || '';
          displayRegion = `${province}-${city}`;
          
          // 查找省市在选择器中的索引
          const provinces = this.data.multiArray[0];
          const provinceIndex = provinces.indexOf(province);
          let cityIndex = 0;
          
          if (provinceIndex >= 0 && this.data.provinceData[province]) {
            const cities = this.data.provinceData[province];
            cityIndex = cities.indexOf(city);
            if (cityIndex < 0) cityIndex = 0;
          }
          
          // 更新页面显示
          this.setData({
            workerLocation: {
              region: displayRegion
            },
            multiIndex: [provinceIndex >= 0 ? provinceIndex : 0, cityIndex],
            multiArray: [provinces, provinceIndex >= 0 ? this.data.provinceData[province] : this.data.provinceData[provinces[0]]]
          });
          
          // 保存到数据库和本地存储（仅保存地区）
          const userInfo = wx.getStorageSync('userInfo') || {};
          const userId = userInfo.userId || userInfo._id;
          const token = wx.getStorageSync('token');
          
          if (userId && token) {
            try {
              await wx.cloud.callFunction({
                name: 'auth',
                data: {
                  action: 'updateUserLocation',
                  userId: userId,
                  phoneNumber: userInfo.phone || userInfo.phoneNumber,
                  region: addressInfo.region || ''
                }
              });
              console.log('✅ 地区信息已保存到数据库');
              
              // 更新本地存储
              const updatedUserInfo = {
                ...userInfo,
                region: addressInfo.region || ''
              };
              wx.setStorageSync('userInfo', updatedUserInfo);
              console.log('✅ 地区信息已更新到本地存储');
            } catch (error) {
              console.error('❌ 保存位置信息失败:', error);
            }
          }
        },
        fail: (err) => {
          console.log('📍 位置获取失败（用户可能未授权）:', err);
        }
      });
    } catch (error) {
      console.error('❌ 获取当前位置出错:', error);
    }
  },

  // 逆地理编码（将经纬度转换为地址）
  async reverseGeocode(latitude, longitude) {
    try {
      // 优先使用云函数的腾讯地图API（包含备用方案）
      const result = await this.callTencentMapAPI(latitude, longitude);
      if (result && result.address) {
        console.log('✅ 地址解析成功:', result.address);
        return result;
      }
      
      // 如果云函数返回空，使用本地备用方案
      console.log('⚠️ 云函数未返回有效地址，使用本地备用方案');
      return {
        address: '未知地址',
        region: '未知地区'
      };
    } catch (error) {
      console.error('❌ 逆地理编码失败:', error);
      return {
        address: '未知地址',
        region: '未知地区'
      };
    }
  },

  // 调用云函数进行地址解析
  async callTencentMapAPI(latitude, longitude) {
    try {
      console.log('📡 调用云函数解析地址:', { latitude, longitude });
      
      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'reverseGeocode',
          latitude: latitude,
          longitude: longitude
        }
      });
      
      console.log('📥 云函数返回:', res.result);
      
      if (res.result && res.result.success && res.result.data) {
        const locationData = res.result.data;
        console.log('✅ 地址解析成功:', locationData.address);
        return {
          address: locationData.address,
          region: locationData.region || `${locationData.province}-${locationData.city}-${locationData.district}`
        };
      } else {
        console.log('⚠️ 地址解析失败:', res.result ? res.result.message : '未知错误');
        return null;
      }
    } catch (error) {
      console.error('❌ 调用云函数失败:', error);
      return null;
    }
  },

  // 加载任务数据
  async loadTaskData() {
    try {
      app.showLoading('加载中...');
      
      console.log('🔧 开始加载维修工数据...');
      
      // 获取用户手机号
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      // 调用云函数获取真实数据
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getMyTasks',
          page: 1,
          pageSize: 20,
          phoneNumber: phoneNumber
        }
      });

      console.log('🔧 云函数调用结果:', result);

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取维修工数据:', data);
        
        // 处理数据
        const tasks = data.data || [];
        const urgentTasks = tasks.filter(task => 
          task.priority === 'urgent' || task.priority === 'high'
        );
        
        const recentTasks = tasks.slice(0, 5);
        
        const today = new Date().toDateString();
        const completedToday = tasks.filter(task => {
          const resolvedDate = new Date(task.resolvedTime || task.updateTime).toDateString();
          return task.status === 'resolved' && today === resolvedDate;
        }).length;
        
        const inProgressToday = tasks.filter(task => {
          const assignedDate = new Date(task.assignedTime || task.createTime).toDateString();
          return task.status === 'processing' && today === assignedDate;
        }).length;
        
        // 计算平均评分
        const completedTasks = tasks.filter(task => task.status === 'resolved' && task.satisfaction);
        const avgRating = completedTasks.length > 0 
          ? completedTasks.reduce((sum, task) => sum + task.satisfaction, 0) / completedTasks.length 
          : 0;
        
        // 计算待处理任务数量（已分配和处理中的任务）
        const pendingTasks = tasks.filter(task => 
          task.status === 'assigned' || task.status === 'processing'
        );
        
        this.setData({
          pendingTaskCount: pendingTasks.length,
          taskOverview: {
            highPriority: urgentTasks.length,
            mediumPriority: tasks.filter(task => task.priority === 'medium').length,
            completed: tasks.filter(task => task.status === 'resolved').length
          },
          urgentTasks: urgentTasks.map(task => ({
            id: task.issueId || task._id,
            title: task.title,
            description: task.description,
            customerName: task.clientName,
            assignTime: this.formatTime(task.assignedTime || task.createTime)
          })),
          recentTasks: recentTasks.map(task => ({
            id: task.issueId || task._id,
            title: task.title,
            status: task.status,
            statusText: this.getStatusText(task.status),
            customerName: task.clientName,
            updateTime: this.formatTime(task.updateTime)
          })),
          todayStats: {
            completed: completedToday,
            inProgress: inProgressToday,
            rating: Math.round(avgRating * 10) / 10
          }
        });
        
        console.log('🔧 数据加载完成:');
        console.log('  紧急任务:', urgentTasks.length, '个');
        console.log('  今日完成:', completedToday, '个');
        console.log('  今日进行中:', inProgressToday, '个');
        console.log('  平均评分:', avgRating);
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        // 失败时使用模拟数据作为备用
        await this.loadFallbackData();
      }
      
    } catch (error) {
      console.error('❌ 加载数据失败:', error);
      // 出错时使用模拟数据作为备用
      await this.loadFallbackData();
    } finally {
      app.hideLoading();
    }
  },

  // 备用数据（当云函数调用失败时）
  async loadFallbackData() {
    console.log('🔄 使用备用模拟数据...');
    const data = await this.mockGetTaskData();
    
    this.setData({
      pendingTaskCount: data.pendingTaskCount || 0,
      taskOverview: data.overview,
      urgentTasks: data.urgentTasks,
      recentTasks: data.recentTasks,
      todayStats: data.todayStats
    });
  },

  // 获取状态文本
  getStatusText(status) {
    const map = {
      'assigned': '已分配',
      'processing': '处理中',
      'parts_sent': '配件已发出',
      'parts_received': '返件已收到',
      'resolved': '已解决',
      'closed': '已关闭',
      'cancelled': '已取消'
    };
    return map[status] || '未知';
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 模拟获取任务数据
  mockGetTaskData() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          pendingTaskCount: 8, // 模拟待处理任务数量
          overview: {
            highPriority: 3,
            mediumPriority: 5,
            completed: 12
          },
          urgentTasks: [
            {
              id: 'T001',
              title: '空调制冷效果差',
              description: '驻车空调开启后制冷效果不明显，温度下降很慢',
              customerName: '张先生',
              assignTime: '2024-01-15 14:30'
            },
            {
              id: 'T003',
              title: '空调无法启动',
              description: '按下开关后空调没有任何反应，指示灯也不亮',
              customerName: '李女士',
              assignTime: '2024-01-16 08:45'
            }
          ],
          recentTasks: [
            {
              id: 'T002',
              title: '空调异响问题',
              status: 'completed',
              statusText: '已完成',
              customerName: '王先生',
              updateTime: '2024-01-12 10:30'
            },
            {
              id: 'T004',
              title: '温度控制不准确',
              status: 'in_progress',
              statusText: '进行中',
              customerName: '赵女士',
              updateTime: '2024-01-15 09:10'
            }
          ],
          todayStats: {
            completed: 2,
            inProgress: 3,
            rating: 4.8
          }
        });
      }, 1000);
    });
  },

  // 跳转到我的任务
  onGoTasks() {
    wx.navigateTo({
      url: '/pages/worker/tasks/tasks'
    });
  },

  // 跳转到历史记录
  onGoHistory() {
    wx.navigateTo({
      url: '/pages/worker/history/history'
    });
  },

  // 查看紧急任务
  onViewUrgentTask(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/worker/task-detail/task-detail?id=${taskId}`
    });
  },

  // 查看最近任务
  onViewRecentTask(e) {
    const taskId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/worker/task-detail/task-detail?id=${taskId}`
    });
  },

  // 查看全部任务
  onViewAllTasks() {
    wx.navigateTo({
      url: '/pages/worker/tasks/tasks'
    });
  },

  // 退出登录
  onLogout() {
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

  // 下拉刷新
  onPullDownRefresh() {
    this.loadTaskData();
    wx.stopPullDownRefresh();
  },

  // 显示地区选择器
  showRegionPicker() {
    // 如果已有选择的地区，定位到对应的省市
    if (this.data.workerLocation && this.data.workerLocation.region) {
      const parts = this.data.workerLocation.region.split('-');
      const province = parts[0];
      const city = parts[1];
      
      const provinceIndex = this.data.provinceList.indexOf(province);
      if (provinceIndex >= 0) {
        const cities = this.data.provinceData[province];
        const cityIndex = cities.indexOf(city);
        
        this.setData({
          selectedProvinceIndex: provinceIndex,
          cityList: cities,
          selectedCityIndex: cityIndex >= 0 ? cityIndex : 0
        });
      }
    }
    
    this.setData({
      showRegionModal: true,
      searchKeyword: '',
      searchResults: []
    });
  },

  // 隐藏地区选择器
  hideRegionPicker() {
    this.setData({
      showRegionModal: false,
      searchKeyword: '',
      searchResults: []
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止点击弹窗内容时关闭弹窗
  },

  // 选择省份
  selectProvince(e) {
    const index = e.currentTarget.dataset.index;
    const province = this.data.provinceList[index];
    const cities = this.data.provinceData[province];
    
    this.setData({
      selectedProvinceIndex: index,
      cityList: cities,
      selectedCityIndex: 0 // 重置城市选择
    });
  },

  // 选择城市
  selectCity(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      selectedCityIndex: index
    });
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({ searchKeyword: keyword });
    
    if (!keyword) {
      this.setData({ searchResults: [] });
      return;
    }
    
    // 搜索省份和城市
    const results = [];
    const provinceData = this.data.provinceData;
    
    Object.keys(provinceData).forEach(province => {
      // 搜索省份名
      if (province.indexOf(keyword) >= 0) {
        // 如果省份匹配，添加该省的所有城市（除了"全部"）
        provinceData[province].forEach(city => {
          if (city !== '全部') {
            results.push({ province, city });
          }
        });
      } else {
        // 搜索城市名
        provinceData[province].forEach(city => {
          if (city !== '全部' && city.indexOf(keyword) >= 0) {
            results.push({ province, city });
          }
        });
      }
    });
    
    this.setData({ searchResults: results });
  },

  // 选择搜索结果
  selectSearchResult(e) {
    const { province, city } = e.currentTarget.dataset;
    
    const provinceIndex = this.data.provinceList.indexOf(province);
    const cities = this.data.provinceData[province];
    const cityIndex = cities.indexOf(city);
    
    this.setData({
      selectedProvinceIndex: provinceIndex,
      cityList: cities,
      selectedCityIndex: cityIndex,
      searchKeyword: '',
      searchResults: []
    });
  },

  // 确认选择地区
  async confirmRegion() {
    const province = this.data.provinceList[this.data.selectedProvinceIndex];
    const city = this.data.cityList[this.data.selectedCityIndex];
    
    // 如果选择的是"全部"，则提示用户选择具体城市
    if (city === '全部') {
      wx.showToast({
        title: '请选择具体城市',
        icon: 'none'
      });
      return;
    }
    
    const displayRegion = `${province}-${city}`;
    
    // 更新页面显示
    this.setData({
      workerLocation: {
        region: displayRegion
      },
      showRegionModal: false
    });
    
    // 保存到数据库
    const userInfo = wx.getStorageSync('userInfo') || {};
    const userId = userInfo.userId || userInfo._id;
    const token = wx.getStorageSync('token');
    
    if (!userId || !token) {
      wx.showToast({
        title: '用户信息异常',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '保存中...'
    });
    
    try {
      // 调用云函数更新用户地区信息
      const result = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'updateUserLocation',
          userId: userId,
          phoneNumber: userInfo.phone || userInfo.phoneNumber,
          region: displayRegion
        }
      });
      
      if (result.result && result.result.success) {
        // 更新本地存储
        const updatedUserInfo = {
          ...userInfo,
          region: displayRegion
        };
        wx.setStorageSync('userInfo', updatedUserInfo);
        
        wx.showToast({
          title: '地区已更新',
          icon: 'success'
        });
        
        console.log('✅ 地区信息已保存:', displayRegion);
      } else {
        throw new Error(result.result?.message || '保存失败');
      }
    } catch (error) {
      console.error('❌ 保存地区信息失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
});