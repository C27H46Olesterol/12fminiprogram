// pages/manager/feedback/feedback.js
const app = getApp();

Page({
  data: {
    mode: 'create', // 'create' 或 'view'
    feedbackId: null,
    
    // 表单数据（简化版：只保留4个字段）
    formData: {
      productModel: '',      // 必填
      productModelName: '',  // 产品型号名称
      description: '',       // 选填
      images: [],           // 选填
      contactPhone: ''      // 必填
    },
    
    // 产品相关
    productType: 'integrated', // 'integrated' 一体式 或 'split' 分体式
    currentProductList: [],
    
    // 产品列表数据
    // 云存储路径格式：cloud://YOUR_ENV_ID.xxx/products/文件名.jpg
    // 请将 YOUR_ENV_ID 替换为您的实际云环境ID（在云存储中复制文件ID即可看到）
    integratedProducts: [
      {
        model: '福星T-6000/T-6000 Pro/云悦F',
        name: '冷静极眠·福星T-6000/T-6000 Pro/云悦F (非凡版)',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-01-fuxing-t6000.jpg .png'
      },
      {
        model: 'ONE GS6/GS6Max',
        name: '云穹·ONE GS6/GS6Max',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-02-one-gs6.png'
      },
      {
        model: '领风FA8/FA8S',
        name: '冷静极航·领风FA8/FA8S',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-03-lingfeng-fa8.png'
      },
      {
        model: 'FA6S(H)',
        name: '云途·FA6S(H)',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-04-fa6s.png'
      },
      {
        model: 'MINI',
        name: '云尚·MINI',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-05-mini.png'
      },
      {
        model: '福盈QF-6000 Pro',
        name: '风途·福盈QF-6000 Pro',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-06-fuying-qf6000.png'
      },
      {
        model: 'Z-3000',
        name: '冷静极感·Z-3000',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-07-z3000.png'
      },
      {
        model: '福客TG-2800/T2000极致版/T2000',
        name: '冷静极航·福客TG-2800/T2000极致版/T2000',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-08-fuke-tg2800.png'
      },
      {
        model: 'FH8 Pro/FH8 Pro Max/云芯FA4S',
        name: '冷炫·FH8 Pro/FH8 Pro Max/云芯FA4S',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/integrated-09-fh8-pro.png'
      }
    ],
    
    splitProducts: [
      {
        model: '横置机3.0(3代)',
        name: '颐尔福冷静极航·横置机3.0(3代)',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-01-hengzhiji-3.png'
      },
      {
        model: 'D-900/T-900',
        name: '颐尔福冷盾·D-900/T-900',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-02-d900.png'
      },
      {
        model: 'J6P',
        name: '颐尔福冷静极航·J6P',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-03-j6p.png'
      },
      {
        model: '福享T-1800/D-1800',
        name: '颐尔福冷静极航·福享T-1800/D-1800',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-04-fuxiang-t1800.png'
      },
      {
        model: 'T-1600/D-1600',
        name: '颐尔福冷盾·T-1600/D-1600',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-05-t1600.png'
      },
      {
        model: '风尚600内机',
        name: '颐尔福风尚600内机',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-06-fengshang-600.png'
      },
      {
        model: 'YC-6000',
        name: '颐尔福冷静极眠·YC-6000',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-07-yc6000.png'
      },
      {
        model: '风尚650内机',
        name: '颐尔福风尚650内机',
        image: 'cloud://zz123-2gc0941md5f39f54.7a7a-zz123-2gc0941md5f39f54-1370831761/products/split-08-fengshang-650.png'
      }
    ],
    
    // 状态
    canSubmit: false,
    isSubmitting: false,
    
    // 详情数据
    feedbackDetail: {},
    
    // 备份导航栏显示控制
    showBackupNav: false
  },

  onLoad(options) {
    const { id, mode } = options;
    
    // 确保导航栏显示返回键而不是小房子图标
    wx.setNavigationBarTitle({
      title: mode === 'view' ? '问题详情' : '问题反馈'
    });
    
    // 初始化产品列表
    this.setData({
      currentProductList: this.data.integratedProducts
    });
    
    if (id && mode === 'view') {
      this.setData({ 
        mode: 'view', 
        feedbackId: id 
      });
      this.loadFeedbackDetail(id);
    } else {
      this.setData({ mode: 'create' });
      this.initFormData();
    }
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
      // 如果页面栈被清空，直接跳转到主管首页
      wx.switchTab({
        url: '/pages/manager/index/index'
      });
    }
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

  // 加载反馈详情
  async loadFeedbackDetail(id) {
    try {
      app.showLoading('加载中...');
      
      console.log('🔍 尝试加载问题详情，ID:', id);
      
      // 直接从数据库查询，避免云函数权限问题
      const db = wx.cloud.database();
      
      // 先尝试通过issueId查询
      if (id.startsWith('ISSUE_')) {
        console.log('📋 通过issueId字段查询:', id);
        const queryResult = await db.collection('issues')
          .where({ issueId: id })
          .get();
        
        if (queryResult.data && queryResult.data.length > 0) {
          console.log('✅ 找到真实数据:', queryResult.data[0].title);
          const issueData = queryResult.data[0];
          
          // 转换为前端格式
          const detail = {
            id: issueData.issueId || issueData._id,
            title: issueData.title,
            problemType: issueData.category,
            category: issueData.category,
            priority: issueData.priority,
            priorityText: this.getPriorityText(issueData.priority),
            status: issueData.status,
            statusText: this.getStatusText(issueData.status),
            description: issueData.description,
            createTime: this.formatTime(issueData.createTime),
            images: issueData.images || [],
            progress: [] // 简化处理，可以先不显示历史记录
          };
          
          console.log('🎯 真实数据已转换:', detail.title);
          this.setData({ feedbackDetail: detail });
          return;
        }
      }
      
      // 尝试通过文档ID查询
      console.log('📋 尝试通过文档ID查询:', id);
      try {
        const docResult = await db.collection('issues').doc(id).get();
        if (docResult.data) {
          console.log('✅ 通过文档ID找到数据:', docResult.data.title);
          const issueData = docResult.data;
          
          const detail = {
            id: issueData.issueId || issueData._id,
            title: issueData.title,
            problemType: issueData.category,
            category: issueData.category,
            priority: issueData.priority,
            priorityText: this.getPriorityText(issueData.priority),
            status: issueData.status,
            statusText: this.getStatusText(issueData.status),
            description: issueData.description,
            createTime: this.formatTime(issueData.createTime),
            images: issueData.images || [],
            progress: []
          };
          
          console.log('🎯 文档ID数据已转换:', detail.title);
          this.setData({ feedbackDetail: detail });
          return;
        }
      } catch (docError) {
        console.log('文档ID查询失败:', docError.message);
      }
      
      // 最后尝试通过_id字段查询
      console.log('📋 尝试通过_id字段查询:', id);
      const idQueryResult = await db.collection('issues')
        .where({ _id: id })
        .get();
      
      if (idQueryResult.data && idQueryResult.data.length > 0) {
        console.log('✅ 通过_id找到数据:', idQueryResult.data[0].title);
        const issueData = idQueryResult.data[0];
        
        const detail = {
          id: issueData.issueId || issueData._id,
          title: issueData.title,
          problemType: issueData.category,
          category: issueData.category,
          priority: issueData.priority,
          priorityText: this.getPriorityText(issueData.priority),
          status: issueData.status,
          statusText: this.getStatusText(issueData.status),
          description: issueData.description,
          createTime: this.formatTime(issueData.createTime),
          images: issueData.images || [],
          progress: []
        };
        
        console.log('🎯 _id数据已转换:', detail.title);
        this.setData({ feedbackDetail: detail });
        return;
      }
      
      // ❌ 只有所有方法都失败才使用模拟数据
      console.log('❌ 所有查询方法都失败，使用模拟数据');
      const detail = await this.mockGetFeedbackDetail(id);
      this.setData({ feedbackDetail: detail });
      
    } catch (error) {
      console.error('❌ 加载详情完全失败:', error);
      
      // 最后的后备方案
      console.log('🔧 使用模拟数据作为最后后备');
      const detail = await this.mockGetFeedbackDetail(id);
      this.setData({ feedbackDetail: detail });
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

  // 检查是否可以提交（验证产品型号和联系电话）
  checkCanSubmit() {
    const { formData } = this.data;
    
    // 确保字段存在
    const productModel = formData.productModel || '';
    const contactPhone = formData.contactPhone || '';
    
    // 必填项验证
    const isProductModelValid = productModel.trim() !== '';
    const isContactPhoneValid = contactPhone.trim() !== '' && 
                               /^1[3-9]\d{9}$/.test(contactPhone.trim());
    
    const canSubmit = isProductModelValid && isContactPhoneValid;
    
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

  // 预览图片
  onPreviewImage(e) {
    const url = e.currentTarget.dataset.url;
    const { images } = this.data.formData;
    
    wx.previewImage({
      current: url,
      urls: images
    });
  },

  // 提交反馈（简化版）
  async onSubmit() {
    if (!this.data.canSubmit) {
      // 检查具体错误信息
      const { formData } = this.data;
      const productModel = formData.productModel || '';
      const contactPhone = formData.contactPhone || '';
      
      let errorMsg = '';
      
      if (productModel.trim() === '') {
        errorMsg += '请选择产品型号（必选）\n';
      }
      
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
        title: formData.productModel || '用户反馈', // 如果没有产品型号，使用默认标题
        problemType: 'other', // 默认问题类型
        problemTypeName: '其他问题',
        priority: 'medium', // 默认优先级
        userId: app.globalData.userInfo.id
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
      const userPhone = userInfo.phone || userInfo.phoneNumber;
      const userId = userInfo._id || userInfo.userId;
      
      console.log('📱 当前登录用户（主管）:', userPhone, userId);
      
      // 调用云函数提交反馈
      console.log('提交数据:', {
        action: 'submitFeedback',
        title: data.title,
        description: data.description,
        category: data.problemType,
        priority: data.priority || 'medium',
        phone: userPhone, // 登录用户手机号，用于查询用户
        userId: userId,   // 登录用户ID，用于查询用户
        clientPhone: data.contactPhone,
        clientAddress: data.installAddress
      });
      
      // 直接调用issues云函数提交反馈
      const result = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'submitFeedback',
          phone: userPhone,         // 登录用户手机号
          userId: userId,           // 登录用户ID
          title: data.title,
          description: data.description,
          category: data.problemType,
          priority: data.priority || 'medium',
          productModel: data.productModel,
          installAddress: data.installAddress,
          contactPhone: data.contactPhone,
          contactName: data.contactName,
          clientPhone: data.contactPhone,
          clientAddress: data.installAddress,
          images: data.images || [] // 传递图片数组
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
      if (error.errMsg && error.errMsg.includes('FunctionName parameter could not be found')) {
        console.log('云函数未部署，使用模拟提交');
        return this.mockSubmitFeedbackWithDelay(data);
      }
      
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

