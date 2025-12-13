// utils/api.js - API服务层
const app = getApp();

/**
 * API服务类
 */
class ApiService {
  constructor() {
    // 使用云函数调用方式
  }

  /**
   * 通用云函数调用方法
   */
  async callCloudFunction(functionName, data = {}) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: functionName,
        data: {
          ...data,
          userInfo: app.globalData.userInfo || {}
        },
        success: (res) => {
          if (res.result && res.result.success) {
            resolve(res.result);
          } else {
            reject(res.result || { message: '调用失败' });
          }
        },
        fail: (err) => {
          console.error('云函数调用失败:', err);
          reject(err);
        }
      });
    });
  }

  // ==================== 认证相关 ====================
  
  /**
   * 微信登录
   */
  async wxLogin(code, userInfo) {
    return this.callCloudFunction('auth', {
      action: 'wxLogin',
      code,
      userInfo
    });
  }

  /**
   * 获取用户信息
   */
  async getUserInfo() {
    return this.callCloudFunction('auth', {
      action: 'getUserInfo'
    });
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userInfo) {
    return this.callCloudFunction('auth', {
      action: 'updateUserInfo',
      userInfo
    });
  }

  /**
   * 修改用户角色
   */
  async changeUserRole(userId, role) {
    return this.callCloudFunction('auth', {
      action: 'changeUserRole',
      userId,
      role
    });
  }

  // ==================== 客户相关 ====================
  
  /**
   * 提交反馈
   */
  async submitFeedback(feedbackData) {
    return this.callCloudFunction('issues', {
      action: 'submitFeedback',
      ...feedbackData
    });
  }

  /**
   * 查询反馈进度
   */
  async getFeedbackProgress(feedbackId) {
    return this.callCloudFunction('issues', {
      action: 'getIssueDetail',
      issueId: feedbackId
    });
  }

  /**
   * 获取常见问题
   */
  async getFAQ() {
    return this.callCloudFunction('faq', {
      action: 'getFAQ'
    });
  }

  // ==================== 主管相关 ====================
  
  /**
   * 获取待处理问题列表
   */
  async getPendingIssues(params = {}) {
    return this.callCloudFunction('issues', {
      action: 'getPendingIssues',
      ...params
    });
  }

  /**
   * 获取已分配问题列表
   */
  async getAssignedIssues(params = {}) {
    return this.callCloudFunction('issues', {
      action: 'getAssignedIssues',
      ...params
    });
  }

  /**
   * 获取已解决问题列表
   */
  async getResolvedIssues(params = {}) {
    return this.callCloudFunction('issues', {
      action: 'getResolvedIssues',
      ...params
    });
  }

  /**
   * 获取问题详情
   */
  async getIssueDetail(issueId) {
    return this.callCloudFunction('issues', {
      action: 'getIssueDetail',
      issueId
    });
  }

  /**
   * 设置问题优先级
   */
  async setIssuePriority(issueId, priority) {
    return this.callCloudFunction('issues', {
      action: 'setIssuePriority',
      issueId,
      priority
    });
  }

  /**
   * 分配维修工
   */
  async assignWorker(issueId, workerId) {
    return this.callCloudFunction('issues', {
      action: 'assignWorker',
      issueId,
      workerId
    });
  }

  /**
   * 获取维修工列表
   */
  async getWorkers() {
    return this.callCloudFunction('auth', {
      action: 'getWorkers'
    });
  }

  /**
   * 获取统计数据
   */
  async getStatistics(params = {}) {
    return this.callCloudFunction('statistics', {
      action: 'getStatistics',
      ...params
    });
  }

  // ==================== 维修工相关 ====================
  
  /**
   * 获取我的任务列表
   */
  async getMyTasks(params = {}) {
    return this.callCloudFunction('issues', {
      action: 'getMyTasks',
      ...params
    });
  }

  /**
   * 获取任务详情
   */
  async getTaskDetail(taskId) {
    return this.callCloudFunction('issues', {
      action: 'getIssueDetail',
      issueId: taskId
    });
  }

  /**
   * 标记任务为处理中
   */
  async markTaskProcessing(taskId, processingRecord) {
    return this.callCloudFunction('issues', {
      action: 'updateIssueStatus',
      issueId: taskId,
      status: 'processing',
      processingRecord
    });
  }

  /**
   * 完成任务
   */
  async completeTask(taskId, resultDescription) {
    return this.callCloudFunction('issues', {
      action: 'updateIssueStatus',
      issueId: taskId,
      status: 'resolved',
      resultDescription
    });
  }

  /**
   * 申请协助
   */
  async requestAssistance(taskId, reason) {
    return this.callCloudFunction('issues', {
      action: 'requestAssistance',
      issueId: taskId,
      reason
    });
  }

  /**
   * 获取历史记录
   */
  async getHistory(params = {}) {
    return this.callCloudFunction('issues', {
      action: 'getMyHistory',
      ...params
    });
  }

  // ==================== 管理员相关 ====================
  
  /**
   * 获取用户列表
   */
  async getUsers(params = {}) {
    return this.callCloudFunction('auth', {
      action: 'getUsers',
      ...params
    });
  }

  /**
   * 修改用户角色
   */
  async changeUserRole(userId, role) {
    return this.callCloudFunction('auth', {
      action: 'changeUserRole',
      userId,
      role
    });
  }

  // ==================== 文件上传 ====================
  
  /**
   * 上传图片
   */
  async uploadImage(filePath) {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: `images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
        filePath: filePath,
        success: (res) => {
          resolve({
            success: true,
            data: {
              fileID: res.fileID,
              url: res.fileID
            }
          });
        },
        fail: (err) => {
          reject({
            success: false,
            message: '上传失败: ' + err.errMsg
          });
        }
      });
    });
  }

  /**
   * 上传文档
   */
  async uploadDocument(filePath) {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath: `documents/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`,
        filePath: filePath,
        success: (res) => {
          resolve({
            success: true,
            data: {
              fileID: res.fileID,
              url: res.fileID
            }
          });
        },
        fail: (err) => {
          reject({
            success: false,
            message: '上传失败: ' + err.errMsg
          });
        }
      });
    });
  }

  // ==================== 消息通知 ====================
  
  /**
   * 获取通知列表
   */
  async getNotifications(params = {}) {
    return this.callCloudFunction('notifications', {
      action: 'getNotifications',
      ...params
    });
  }

  /**
   * 标记通知为已读
   */
  async markNotificationRead(notificationId) {
    return this.callCloudFunction('notifications', {
      action: 'markAsRead',
      notificationId
    });
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount() {
    return this.callCloudFunction('notifications', {
      action: 'getUnreadCount'
    });
  }
}

// 创建单例实例
const apiService = new ApiService();

module.exports = apiService;
