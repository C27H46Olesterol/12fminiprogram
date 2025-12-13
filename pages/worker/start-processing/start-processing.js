// pages/worker/start-processing/start-processing.js
const app = getApp();

Page({
  data: {
    issue: null,
    needParts: false,  // 默认不需要配件
    partsDetail: ''
  },

  onLoad(options) {
    // 兼容 taskId 和 issueId 参数
    const issueId = options.issueId || options.taskId;
    if (!issueId) {
      wx.showToast({
        title: '缺少工单ID',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ issueId });
    this.loadIssueDetail(issueId);
  },

  /**
   * 加载工单详情
   */
  async loadIssueDetail(issueId) {
    wx.showLoading({ title: '加载中...' });

    try {
      // 从 userInfo 中获取手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;
      
      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'getIssueDetail',
          issueId: issueId,
          phoneNumber: phoneNumber
        }
      });

      console.log('📋 工单详情:', res.result);

      if (res.result.success) {
        this.setData({
          issue: res.result.data.issue
        });
      } else {
        wx.showToast({
          title: res.result.message || '加载失败',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      }
    } catch (error) {
      console.error('❌ 加载工单详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 是否需要配件改变
   */
  onNeedPartsChange(e) {
    const value = e.detail.value === 'true'; // 将字符串转换为布尔值
    console.log('📝 配件需求变更:', value);
    this.setData({
      needParts: value,
      partsDetail: value ? this.data.partsDetail : '' // 如果不需要配件，清空配件详情
    });
  },

  /**
   * 配件详情输入
   */
  onPartsDetailInput(e) {
    this.setData({
      partsDetail: e.detail.value
    });
  },

  /**
   * 取消
   */
  onCancel() {
    wx.navigateBack();
  },

  /**
   * 确认开始处理
   */
  async onConfirm() {
    const { issueId, needParts, partsDetail } = this.data;

    // 验证
    if (needParts && !partsDetail) {
      wx.showToast({
        title: '请填写配件详情',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '处理中...' });

    try {
      // 从 userInfo 中获取手机号（兼容 phone 和 phoneNumber 字段）
      const userInfo = wx.getStorageSync('userInfo') || {};
      const phoneNumber = userInfo.phone || userInfo.phoneNumber;

      console.log('📤 调用云函数 startProcessing，参数:', {
        action: 'startProcessing',
        issueId: issueId,
        needParts: needParts,
        partsDetail: needParts ? partsDetail : '',
        phoneNumber: phoneNumber
      });
      
      const res = await wx.cloud.callFunction({
        name: 'issues',
        data: {
          action: 'startProcessing',
          issueId: issueId,
          needParts: needParts,
          partsDetail: needParts ? partsDetail : '',
          phoneNumber: phoneNumber
        }
      });

      console.log('✅ 开始处理结果:', res.result);

      if (res.result.success) {
        console.log('🔄 准备返回并刷新上一页...');
        
        // 延迟跳转，让用户看到成功提示
        setTimeout(async () => {
          // 返回上一页并刷新
          const pages = getCurrentPages();
          console.log('📄 当前页面栈长度:', pages.length);
          
          if (pages.length >= 2) {
            const prevPage = pages[pages.length - 2];
            console.log('📄 上一页路由:', prevPage.route);
            console.log('📄 上一页是否有 loadData 方法:', typeof prevPage.loadData);
            
            if (prevPage.loadData) {
              console.log('🔄 调用上一页的 loadData 方法并等待完成');
              try {
                await prevPage.loadData();
                console.log('✅ 上一页数据刷新完成');
              } catch (error) {
                console.error('❌ 刷新上一页数据失败:', error);
              }
            } else {
              console.warn('⚠️ 上一页没有 loadData 方法，尝试调用其他刷新方法');
              // 尝试调用其他可能的刷新方法
              if (prevPage.loadIssueDetail) {
                await prevPage.loadIssueDetail();
              } else if (prevPage.loadTaskDetail) {
                await prevPage.loadTaskDetail();
              } else if (prevPage.loadTasks) {
                await prevPage.loadTasks();
              }
            }
          }
          
          console.log('🔙 执行返回操作');
          
          // 显示成功提示
          wx.showToast({
            title: '开始处理成功',
            icon: 'success',
            duration: 2000
          });
          
          // 立即返回
          wx.navigateBack();
        }, 300);
      } else {
        wx.showToast({
          title: res.result.message || '开始处理失败',
          icon: 'none',
          duration: 2000
        });
      }
    } catch (error) {
      console.error('❌ 开始处理失败:', error);
      wx.showToast({
        title: '开始处理失败: ' + error.message,
        icon: 'none',
        duration: 2000
      });
    } finally {
      wx.hideLoading();
    }
  }
});
