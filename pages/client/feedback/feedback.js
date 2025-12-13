// pages/client/feedback/feedback.js
const app = getApp();

Page({
  data: {
    mode: 'create', // 'create' 或 'view'
    feedbackId: null,  
    
    // 表单数据（简化版：只保留4个字段）
    formData: {
      productCode:'',        // 选填
      description: '',       // 选填
      images: [],           // 选填
      contactPhone: '',      // 必填
      // 位置信息 选填
      locationProvince: '',  // 省
      locationCity: '',      // 市
      locationDistrict: '',  // 区/县
      locationDetail: '',    // 详细地址
      fullLocation: '',      // 完整地址：省-区/县-详细地址
      faultTypes: []         // 常见故障多选
    },
    faultOptions: ['不启动','不制冷','有噪音','其他故障'],
    
    // 地区选择器
    locationRegion: ['', '', ''],
    locationDisplayText: '',
    isGettingLocation: false,
    
    // 详情页数据
    history: [],
    
    // 状态
    canSubmit: false,
    isSubmitting: false,
    isCancelling: false,
    
    // 详情数据
    feedbackDetail: {},
    
    // 备份导航栏显示控制
    showBackupNav: false
  },

  // 取消工单
  onCancelIssue() {
    const { feedbackDetail, isCancelling } = this.data;
    
    if (isCancelling) {
      return;
    }
    
    if (!feedbackDetail || !feedbackDetail.issueId) {
      app.showError('未找到工单信息');
      return;
    }
    
    if (['resolved', 'closed', 'cancelled'].includes(feedbackDetail.status)) {
      wx.showToast({
        title: '当前状态无法取消',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认取消工单',
      content: '取消后工单将停止处理，确定要取消吗？',
      confirmText: '确认取消',
      confirmColor: '#f4511e',
      success: async (res) => {
        if (!res.confirm) return;
        
        const userInfo = wx.getStorageSync('userInfo') || {};
        const phoneNumber = userInfo.phone || userInfo.phoneNumber;
        
        if (!phoneNumber) {
          app.showError('未找到当前用户手机号，无法取消工单');
          return;
        }
        
        try {
          this.setData({ isCancelling: true });
          app.showLoading('取消中...');
          
          const result = await wx.cloud.callFunction({
            name: 'issues',
            data: {
              action: 'cancelIssue',
              issueId: feedbackDetail.issueId,
              phoneNumber,
              reason: '客户主动取消工单'
            }
          });
          if (result.result && result.result.success) {
            wx.showToast({
              title: '工单已取消',
              icon: 'success'
            });
            this.loadFeedbackDetail(feedbackDetail.issueId);
          } else {
            const message = result.result?.message || '取消失败，请稍后重试';
            app.showError(message);
          }
        } catch (error) {
          console.error('取消工单失败:', error);
          app.showError('取消失败，请稍后重试');
        } finally {
          this.setData({ isCancelling: false });
          app.hideLoading();
        }
      }
    });
  },

  onLoad(options) {
    const { id, mode } = options;
    
    // 确保导航栏显示返回键而不是小房子图标
    wx.setNavigationBarTitle({
      title: mode === 'view' ? '问题详情' : '问题反馈'
    });
    
    // 初始化产品列表
    // this.setData({
    //   currentProductList: this.data.integratedProducts
    // });
    
    if (id && mode === 'view') {
      this.setData({ 
        mode: 'view', 
        feedbackId: id 
      });
      this.loadFeedbackDetail(id);
    } else {
      this.setData({ mode: 'create' });
      this.initFormData();
      this.onGetLocation();
      // 自动获取并填入电话号码
      this.getPhone();
      this.checkCanSubmit();
    }
  },

  onFaultOptionsChange(e) {
    const selected = e.detail.value || [];
    this.setData({
      'formData.faultTypes': selected
    });
  },

  // 页面卸载时清理资源
  onUnload() {
    // 清理页面资源
  },

  // 智能返回处理 - 避免出现小房子图标
  onSmartBack() {
    const pages = getCurrentPages();
    
    // 如果页面栈长度大于1，说明可以正常返回
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      // 如果页面栈被清空，直接跳转到客户首页
      wx.switchTab({
        url: '/pages/client/index/index'
      });
    }
  },

  onProductCodeInput(e) {
    const productCode = e.detail.value;
    let errorMsg='';
    if (productCode.trim() === '' || !/^[1-9]\d{5}MO\d{14}$/.test(productCode.trim())) {
      errorMsg += '该产品码不合法\n';
      //输入框后x -> √
      // return
    }
    this.setData({ 
      'formData.productCode': productCode
    });
    this.checkCanSubmit();
  },

  // 扫描二维码
  onScanQRCode() {
    wx.scanCode({
      onlyFromCamera: false, // 允许从相册选择
      scanType: ['qrCode', 'barCode'], // 支持二维码和条形码
      success: (res) => {
        console.log('扫描结果:', res);
        const result = res.result || res.path || '';
        
        if (result) {
          // 将扫描结果填入输入框
          this.setData({
            'formData.productCode': result
          });
          
          wx.showToast({
            title: '扫描成功',
            icon: 'success',
            duration: 1500
          });
          
          this.checkCanSubmit();
        } else {
          wx.showToast({
            title: '未识别到内容',
            icon: 'none',
            duration: 2000
          });
        }
      },
      fail: (err) => {
        console.error('扫描失败:', err);
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({
            title: '扫描失败，请重试',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  // 初始化表单数据
  initFormData() {
    const userInfo = app.globalData.userInfo;
    if (userInfo) {
      this.setData({
        'formData.contactPhone': userInfo.phone,
        'formData.contactName': userInfo.name
      });
    }
    // 不在页面加载时进行验证，让用户先填写内容
  },

  // 将云存储 fileID 转换为临时 URL
  async convertFileIDsToUrls(fileIDs) {
    if (!fileIDs || fileIDs.length === 0) {
      return [];
    }

    try {
      const urlPromises = fileIDs.map(fileID => {
        return new Promise((resolve) => {
          // 如果已经是 http/https URL，直接使用
          if (fileID.startsWith('http://') || fileID.startsWith('https://')) {
            resolve(fileID);
            return;
          }

          // 否则通过云存储获取临时链接
          wx.cloud.getTempFileURL({
            fileList: [fileID],
            success: (res) => {
              if (res.fileList && res.fileList.length > 0 && res.fileList[0].tempFileURL) {
                resolve(res.fileList[0].tempFileURL);
              } else {
                console.error('获取临时链接失败:', fileID, res);
                resolve(fileID); // 降级处理，使用原 fileID
              }
            },
            fail: (err) => {
              console.error('getTempFileURL 失败:', fileID, err);
              resolve(fileID); // 降级处理，使用原 fileID
            }
          });
        });
      });

      const urls = await Promise.all(urlPromises);
      return urls;
    } catch (error) {
      console.error('转换图片 URL 失败:', error);
      return fileIDs; // 降级处理，返回原 fileIDs
    }
  },

  // 加载反馈详情（使用云函数，与主管端一致）
  async loadFeedbackDetail(id) {
    try {
      app.showLoading('加载中...');
      
      console.log('📋 开始加载问题详情...', 'issueId:', id);
      
      // 获取用户手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      console.log('📱 用户手机号:', phoneNumber);
      
      // 调用云函数获取问题详情
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: id,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 云函数调用结果:', JSON.stringify(result.result, null, 2));

      if (result.result && result.result.success) {
        const data = result.result.data;
        console.log('✅ 成功获取问题详情:', {
          issueId: data.issue.issueId,
          status: data.issue.status,
          needParts: data.issue.needParts,
          partsDetail: data.issue.partsDetail,
          assignedWorkerName: data.issue.assignedWorkerName,
          images: data.issue.images,
          hasImages: !!data.issue.images,
          imagesLength: data.issue.images?.length || 0,
          faultTypes: data.issue.faultTypes,
          productCode: data.issue.productCode
        });
        
        // 处理图片：将云存储 fileID 转换为临时 URL
        if (data.issue.images && data.issue.images.length > 0) {
          console.log('🖼️ 开始转换图片 fileID 为临时 URL...');
          const imageUrls = await this.convertFileIDsToUrls(data.issue.images);
          data.issue.imageUrls = imageUrls;
          console.log('✅ 图片 URL 转换完成:', imageUrls);
        }
        
        // 处理返件图片
        if (data.issue.partsImages && data.issue.partsImages.length > 0) {
          console.log('🖼️ 开始转换返件图片 fileID 为临时 URL...');
          const partsImageUrls = await this.convertFileIDsToUrls(data.issue.partsImages);
          data.issue.partsImageUrls = partsImageUrls;
          console.log('✅ 返件图片 URL 转换完成:', partsImageUrls);
        }
        
        this.setData({
          feedbackDetail: data.issue,
          history: data.history || []
        });
        
        console.log('📋 页面数据已更新:', {
          status: this.data.feedbackDetail.status,
          needParts: this.data.feedbackDetail.needParts,
          images: this.data.feedbackDetail.images,
          imageUrls: this.data.feedbackDetail.imageUrls,
          imagesCount: this.data.feedbackDetail.images?.length || 0
        });
        
      } else {
        console.error('❌ 云函数调用失败:', result.result?.message);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('❌ 加载问题详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      app.hideLoading();
    }
  },

  // 模拟获取反馈详情
  mockGetFeedbackDetail(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('使用模拟数据，ID:', id);
        
        // 根据不同的模拟ID返回不同的数据
        let detailData = {
          id: id,
          issueId: id,
          title: '空调制冷效果差',
          problemType: '制冷问题',
          category: 'cooling',
          priority: 'high',
          priorityText: '非常紧急',
          status: 'assigned',
          statusText: '已分配',
          description: '驻车空调开启后制冷效果不明显，温度下降很慢，已经影响正常使用。',
          createTime: '2024-01-15 14:30',
          updateTime: '2024-01-15 16:20',
          images: [],
          processingRecords: []
        };

        console.log('模拟数据已返回:', detailData.title);
        resolve(detailData);
      }, 1000);
    });
  },

  // 获取优先级文本
  getPriorityText(priority) {
    const priorityMap = {
      'high': '非常紧急',
      'medium': '一般紧急', 
      'low': '不紧急'
    };
    return priorityMap[priority] || '一般紧急';
  },

  // 获取状态文本
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
    return statusMap[status] || '待处理';
  },

  // 格式化时间
  formatTime(timeStr) {
    if (!timeStr) return '';
    
    try {
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return timeStr;
    }
  },

  // 产品类型切换
  onProductTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    const productList = type === 'integrated' ? this.data.integratedProducts : this.data.splitProducts;
    
    this.setData({
      productType: type,
      currentProductList: productList
    });
  },

  // 产品型号选择
  onProductModelSelect(e) {
    const model = e.currentTarget.dataset.model;
    const name = e.currentTarget.dataset.name;
    
    this.setData({
      'formData.productModel': model,
      'formData.productModelName': name
    });
    this.checkCanSubmit();
  },

  // 产品型号输入（保留兼容性）
  onProductModelInput(e) {
    this.setData({ 
      'formData.productModel': e.detail.value,
      hasUserInteracted: e.detail.value.length > 0 // 只在有内容时标记用户交互
    });
    this.checkCanSubmit();
  },

  // 购买时间选择
  onPurchaseDateChange(e) {
    this.setData({ 'formData.purchaseDate': e.detail.value });
  },

  // 安装地址输入
  onInstallAddressInput(e) {
    this.setData({ 
      'formData.installAddress': e.detail.value,
      hasUserInteracted: e.detail.value.length > 0 // 只在有内容时标记用户交互
    });
    this.checkCanSubmit();
  },

  // 问题标题输入
  onTitleInput(e) {
    this.setData({ 
      'formData.title': e.detail.value,
      hasUserInteracted: e.detail.value.length > 0 // 只在有内容时标记用户交互
    });
    this.checkCanSubmit();
  },

  // 问题类型选择
  onProblemTypeChange(e) {
    this.setData({ problemTypeIndex: parseInt(e.detail.value) });
  },

  // 问题描述输入
  onDescriptionInput(e) {
    this.setData({ 
      'formData.description': e.detail.value,
      hasUserInteracted: e.detail.value.length > 0 // 只在有内容时标记用户交互
    });
    this.checkCanSubmit();
  },

  // 优先级选择
  onPriorityChange(e) {
    const priority = e.currentTarget.dataset.priority;
    this.setData({ 'formData.priority': priority });
  },

  //联系电话自动输入
  getPhone() {
    try {
      // 如果输入框中已有值，则不覆盖
      if (this.data.formData.contactPhone && this.data.formData.contactPhone.trim() !== '') {
        console.log('📱 联系电话已有值，跳过自动填充');
        return this.data.formData.contactPhone;
      }
      
      // 优先从全局数据获取
      let userInfo = app.globalData.userInfo;
      
      // 如果全局数据中没有，从本地存储获取
      if (!userInfo || (!userInfo.phone && !userInfo.phoneNumber)) {
        userInfo = wx.getStorageSync('userInfo') || {};
      }
      
      // 获取电话号码（兼容 phone 和 phoneNumber 字段）
      const phone = userInfo.phone || userInfo.phoneNumber || '';
      
      if (phone) {
        console.log('✅ 自动获取电话号码:', phone);
        this.setData({
          'formData.contactPhone': phone
        });
        
        // 更新验证状态
        // this.checkCanSubmit();
        
        return phone;
      } else {
        console.log('⚠️ 未找到用户电话号码');
        return '';
      }
    } catch (error) {
      console.error('❌ 获取电话号码失败:', error);
      return '';
    }
  },

  // 联系电话输入
  onContactPhoneInput(e) {
    this.setData({ 
      'formData.contactPhone': e.detail.value,
      hasUserInteracted: e.detail.value.length > 0 // 只在有内容时标记用户交互
    });
    this.checkCanSubmit();
  },

  // 联系人输入
  onContactNameInput(e) {
    this.setData({ 'formData.contactName': e.detail.value });
  },

  // 地区选择器变化
  onLocationRegionChange(e) {
    const region = e.detail.value; // [省, 市, 区]
    const province = region[0] || '';
    const city = region[1] || '';
    const district = region[2] || '';
    
    // 构建显示文本
    const displayParts = [];
    if (province) displayParts.push(province);
    if (city) displayParts.push(city);
    if (district) displayParts.push(district);
    const displayText = displayParts.join(' ');
    
    this.setData({
      locationRegion: region,
      locationDisplayText: displayText,
      'formData.locationProvince': province,
      'formData.locationCity': city,
      'formData.locationDistrict': district
    });
    
    // 更新完整地址
    this.updateFullLocation();
  },

  // 详细地址输入
  onLocationDetailInput(e) {
    const detail = e.detail.value;
    this.setData({
      'formData.locationDetail': detail
    });
    this.updateFullLocation();
  },

  // 更新完整地址（格式：省-区/县-详细地址）
  updateFullLocation() {
    const { formData } = this.data;
    const parts = [];
    
    // 省（必填）
    if (formData.locationProvince) {
      parts.push(formData.locationProvince);
    }
    
    // 区/县（优先使用区，如果没有区但有县则使用县，如果都没有则跳过）
    if (formData.locationDistrict) {
      parts.push(formData.locationDistrict);
    } else if (formData.locationCity && formData.locationCity.includes('县')) {
      // 如果市名包含"县"，也可以作为区/县使用
      parts.push(formData.locationCity);
    }
    // 注意：如果只有市没有区/县，按照格式要求应该跳过，不显示市
    
    // 详细地址（可选）
    if (formData.locationDetail) {
      parts.push(formData.locationDetail);
    }
    
    const fullLocation = parts.join('-');
    
    this.setData({
      'formData.fullLocation': fullLocation
    });
  },

  // 获取当前位置（定位服务）
  async onGetLocation() {
    this.setData({ isGettingLocation: true });
    
    try {
      // 获取地理位置
      const locationRes = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        });
      });
      
      console.log('定位成功:', locationRes);
      
      // 逆地理编码获取地址信息
      const addressInfo = await this.reverseGeocode(locationRes.latitude, locationRes.longitude);
      
      console.log('地址解析结果:', addressInfo);
      
      // 解析地址信息
      if (addressInfo && addressInfo.address) {
        // 尝试从地址中提取省市区信息
        const region = this.parseAddress(addressInfo.address);
        
        this.setData({
          locationRegion: [region.province || '', region.city || '', region.district || ''],
          locationDisplayText: [region.province, region.city, region.district].filter(Boolean).join(' '),
          'formData.locationProvince': region.province || '',
          'formData.locationCity': region.city || '',
          'formData.locationDistrict': region.district || '',
          'formData.locationDetail': region.detail || ''
        });
        
        // 更新完整地址
        this.updateFullLocation();
        
        // wx.showToast({
        //   title: '定位成功',
        //   icon: 'success',
        //   duration: 2000
        // });
      } else {
        throw new Error('无法解析地址信息');
      }
    } catch (error) {
      console.error('定位失败:', error);
      wx.showToast({
        title: '定位失败，请手动选择',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ isGettingLocation: false });
    }
  },

  // 逆地理编码（将经纬度转换为地址）
  async reverseGeocode(latitude, longitude) {
    try {
      // 使用腾讯地图API进行逆地理编码
      // 这里可以调用云函数或直接使用API
      // 示例：调用云函数
      const result = await wx.cloud.callFunction({
        name: 'auth', // 假设在auth云函数中有逆地理编码功能
        data: {
          action: 'reverseGeocode',
          latitude: latitude,
          longitude: longitude
        }
      });
      
      if (result.result && result.result.success) {
        return result.result.data;
      }
      
      // 如果云函数不可用，返回基础信息
      return {
        address: '未知地址',
        province: '',
        city: '',
        district: ''
      };
    } catch (error) {
      console.error('逆地理编码失败:', error);
      // 返回基础信息
      return {
        address: '未知地址',
        province: '',
        city: '',
        district: ''
      };
    }
  },

  // 解析地址字符串，提取省市区信息
  parseAddress(address) {
    const result = {
      province: '',
      city: '',
      district: '',
      detail: ''
    };
    
    // 中国省份列表（简化版）
    const provinces = ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', 
                     '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', 
                     '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', 
                     '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '香港', '澳门', '台湾'];
    
    // 尝试提取省份
    for (const province of provinces) {
      if (address.includes(province)) {
        result.province = province;
        break;
      }
    }
    
    // 尝试提取市（在省份之后）
    if (result.province) {
      const afterProvince = address.split(result.province)[1] || '';
      // 查找"市"、"州"、"盟"等
      const cityMatch = afterProvince.match(/([^省市区县]+?)(市|州|盟|地区)/);
      if (cityMatch) {
        result.city = cityMatch[1] + cityMatch[2];
      }
    }
    
    // 尝试提取区/县
    const districtMatch = address.match(/([^省市区县]+?)(区|县|市)/);
    if (districtMatch && !districtMatch[1].includes(result.city)) {
      result.district = districtMatch[1] + districtMatch[2];
    }
    
    // 详细地址（剩余部分）
    const parts = [result.province, result.city, result.district];
    let detail = address;
    for (const part of parts) {
      if (part) {
        detail = detail.replace(part, '');
      }
    }
    result.detail = detail.trim();
    
    return result;
  },

  // 检查是否可以提交（验证产品型号和联系电话）
  checkCanSubmit() {
    const { formData } = this.data;
    
    // 确保字段存在
    // const productModel = formData.productModel || '';
    const contactPhone = formData.contactPhone || '';
    
    // 必填项验证
    // const isProductModelValid = productModel.trim() !== '';
    const isContactPhoneValid = contactPhone.trim() !== '' && 
                               /^1[3-9]\d{9}$/.test(contactPhone.trim());
    
    // const canSubmit = isProductModelValid && isContactPhoneValid;
    const canSubmit = isContactPhoneValid;
    
    this.setData({ canSubmit });
  },


  // 清空描述
  clearDescription() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空问题描述内容吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ 'formData.description': '' });
          this.checkCanSubmit();
        }
      }
    });
  },

  // 选择图片
  onChooseImage() {
    const { images } = this.data.formData;
    const remaining = 6 - images.length;
    
    wx.chooseImage({
      count: remaining,
      sizeType: ['original', 'compressed'], // 优先使用原图，提供压缩作为备选
      sourceType: ['album', 'camera'],
      success: (res) => {
        const newImages = [...images, ...res.tempFilePaths];
        this.setData({ 'formData.images': newImages });
        this.checkCanSubmit(); // 添加图片后检查验证
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        app.showError('选择图片失败');
      }
    });
  },

  // 删除图片
  onDeleteImage(e) {
    const index = e.currentTarget.dataset.index;
    const { images } = this.data.formData;
    images.splice(index, 1);
    this.setData({ 'formData.images': images });
    this.checkCanSubmit(); // 删除图片后检查验证
  },

  // 预览图片（创建模式）
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    
    // 判断是创建模式还是查看模式
    if (this.data.mode === 'create') {
      const { images } = this.data.formData;
      wx.previewImage({
        current: url,
        urls: images
      });
    } else {
      // 查看模式
      const current = e.currentTarget.dataset.src || url;
      const urls = this.data.feedbackDetail?.imageUrls || [];
      
      console.log('预览图片:', { current, urls });
      
      wx.previewImage({
        current,
        urls
      });
    }
  },

  // 查看返件图片
  onPreviewPartsImage(e) {
    const current = e.currentTarget.dataset.src;
    const urls = e.currentTarget.dataset.urls || this.data.feedbackDetail?.partsImageUrls || [];
    
    wx.previewImage({
      current,
      urls
    });
  },

  // 图片加载错误处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    console.error('图片加载失败:', {
      index,
      src: e.currentTarget.dataset.src,
      error: e.detail
    });
    
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },

  // 拨打电话
  onCallPhone(e) {
    const phone = e.currentTarget.dataset.phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone
      });
    }
  },

  // 获取评分文本
  getRatingText(rating) {
    const map = {
      1: '很不满意',
      2: '不满意',
      3: '一般',
      4: '满意',
      5: '很满意'
    };
    return map[rating] || '未评价';
  },

  // 获取评分颜色
  getRatingColor(rating) {
    const map = {
      1: '#f5222d',
      2: '#fa8c16',
      3: '#faad14',
      4: '#52c41a',
      5: '#1890ff'
    };
    return map[rating] || '#999';
  },

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.mode === 'view' && this.data.feedbackId) {
      this.loadFeedbackDetail(this.data.feedbackId);
    }
    wx.stopPullDownRefresh();
  },

  // 提交反馈（简化版）
  async onSubmit() {
    if (!this.data.canSubmit) {
      // 检查具体错误信息
      const { formData } = this.data;
      // const productModel = formData.productModel || '';
      const contactPhone = formData.contactPhone || '';
      
      let errorMsg = '';
      if (contactPhone.trim() === '' || !/^1[3-9]\d{9}$/.test(contactPhone.trim())) {
        errorMsg += '请输入正确的手机号码（必填）\n';
      }

      app.showError(errorMsg.trim() || '请填写必填信息');
      return;
    }

    this.setData({ isSubmitting: true });

    try {
      const { formData } = this.data;
      
      // 先上传图片到云存储
      let uploadedImages = [];
      if (formData.images && formData.images.length > 0) {
        wx.showLoading({ title: '上传图片中...' });
        console.log('📤 开始上传图片到云存储，共', formData.images.length, '张');
        
        for (let i = 0; i < formData.images.length; i++) {
          const localPath = formData.images[i];
          try {
            const cloudPath = `issue-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
            console.log(`上传第 ${i + 1}/${formData.images.length} 张:`, cloudPath);
            
            const uploadResult = await wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: localPath
            });
            
            console.log('✅ 上传成功:', uploadResult.fileID);
            uploadedImages.push(uploadResult.fileID);
          } catch (error) {
            console.error('❌ 上传图片失败:', error);
            wx.hideLoading();
            wx.showToast({
              title: `第${i + 1}张图片上传失败`,
              icon: 'none'
            });
            this.setData({ isSubmitting: false });
            return;
          }
        }
        
        wx.hideLoading();
        console.log('✅ 所有图片上传完成:', uploadedImages);
      }
      
      // 构建提交数据（使用默认值）
      const submitData = {
        ...formData,
        images: uploadedImages, // 使用云存储 fileID
        priority: 'medium', // 默认优先级
        userId: app.globalData.userInfo.useId,
        userPhone: app.globalData.userInfo.phoneNumber,
        userRole: app.globalData.userInfo.role,
        uerNickname: app.globalData.userInfo.nickname,
        productCode: formData.productCode,
        clientAddress: formData.fullLocation,
        faultTypes: formData.faultTypes
      };

      // 使用云函数提交
      const result = await this.submitFeedbackToCloud(submitData);
      
      if (result.success) {
        app.showSuccess('反馈提交成功');
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        app.showError(result.message || '提交失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      app.showError('网络错误，请重试');
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  // 使用云函数提交反馈
  async submitFeedbackToCloud(data) {
    try {
      // 获取当前登录用户的手机号和ID
      const userInfo = wx.getStorageSync('userInfo') || {};
      const userPhone = userInfo.phoneNumber;
      const userId = userInfo.userId;
      
      console.log('📱 当前登录用户（客户）:',userInfo, userPhone, userId);
      
      // 调用云函数提交反馈
      console.log('提交数据:', {
        action: 'submitFeedback',
        productCode: data.productCode,
        description: data.description,
        priority: data.priority || 'medium',
        phone: data.userPhone, // 登录用户手机号，用于查询用户
        userId: data.userId,   // 登录用户ID，用于查询用户
        userName: data.userNickname,
        clientAddress: data.clientAddress,
        imageUrls:data.images,
      });
      
      // 直接调用issues云函数提交反馈
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'submitFeedback',
          productCode: data.productCode,
          clientPhone: userPhone,         // 登录用户手机号
          clientId: userId,           // 登录用户ID
          clientName: data.userNickname,
          description: data.description,
          priority: data.priority || 'medium',
          clientAddress: data.clientAddress,
          images: data.images || [], // 传递图片数组
          faultTypes:data.faultTypes || ''
        }
      });

      console.log('云函数调用结果:', JSON.stringify(result, null, 2));
      
      if (result.result && result.result.success) {
        return {
          success: true,
          data: {
            id: result.result.data.issueId,
            issueNumber: result.result.data.issueNumber,
            message: '反馈提交成功，我们会在24小时内联系您'
          }
        };
      } else {
        console.error('云函数调用失败:', result);
        const errorMessage = result.result?.message || result.errMsg || '提交失败';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      
      // 如果是函数未找到错误，使用模拟提交
      // if (error.errMsg && error.errMsg.includes('FunctionName parameter could not be found')) {
      //   console.log('云函数未部署，使用模拟提交');
      //   return this.mockSubmitFeedbackWithDelay(data);
      // }
      
      return {
        success: false,
        message: error.message || '网络错误，请重试'
      };
    }
  },

  // 模拟提交反馈（作为fallback）
  mockSubmitFeedbackWithDelay(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const issueId = 'FB' + Math.random().toString(36).substr(2, 6).toUpperCase();
        const issueNumber = 'ISSUE-' + Date.now();
        
        resolve({
          success: true,
          data: {
            id: issueId,
            issueNumber: issueNumber,
            message: '反馈提交成功，我们会在24小时内联系您（模拟提交）'
          }
        });
      }, 1000);
    });
  }
});
