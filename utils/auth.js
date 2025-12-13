// utils/auth.js - 权限管理工具
const app = getApp();

/**
 * 检查用户权限
 * @param {string} requiredRole - 需要的角色
 * @returns {boolean} 是否有权限
 */
function checkPermission(requiredRole) {
  const userRole = app.globalData.userRole;
  
  if (!userRole) {
    return false;
  }
  
  // 管理员有所有权限
  if (userRole === 'manager') {
    return true;
  }
  
  // 检查具体角色权限
  return userRole === requiredRole;
}

/**
 * 获取用户信息
 * @returns {object|null} 用户信息
 */
function getUserInfo() {
  return app.globalData.userInfo;
}

/**
 * 获取用户角色
 * @returns {string|null} 用户角色
 */
function getUserRole() {
  return app.globalData.userRole;
}

/**
 * 检查是否已登录
 * @returns {boolean} 是否已登录
 */
function isLoggedIn() {
  return !!(app.globalData.userInfo && app.globalData.userRole);
}

/**
 * 根据角色获取首页路径
 * @param {string} role - 用户角色
 * @returns {string} 首页路径
 */
function getHomePageByRole(role) {
  const homePages = {
    'client': '/pages/client/index/index',
    'manager': '/pages/manager/index/index',
    'worker': '/pages/worker/index/index'
  };
  
  return homePages[role] || '/pages/login/login';
}

/**
 * 根据角色获取TabBar配置
 * @param {string} role - 用户角色
 * @returns {object} TabBar配置
 */
function getTabBarByRole(role) {
  const tabBars = {
    'client': {
      list: [
        {
          pagePath: 'pages/client/index/index',
          text: '首页',
          iconPath: 'images/home.png',
          selectedIconPath: 'images/home-active.png'
        },
        {
          pagePath: 'pages/client/progress/progress',
          text: '进度查询',
          iconPath: 'images/progress.png',
          selectedIconPath: 'images/progress-active.png'
        },
        {
          pagePath: 'pages/client/faq/faq',
          text: '常见问题',
          iconPath: 'images/faq.png',
          selectedIconPath: 'images/faq-active.png'
        }
      ]
    },
    'manager': {
      list: [
        {
          pagePath: 'pages/manager/index/index',
          text: '首页',
          iconPath: 'images/home.png',
          selectedIconPath: 'images/home-active.png'
        },
        {
          pagePath: 'pages/manager/pending/pending',
          text: '待处理',
          iconPath: 'images/pending.png',
          selectedIconPath: 'images/pending-active.png'
        },
        {
          pagePath: 'pages/manager/assigned/assigned',
          text: '已分配',
          iconPath: 'images/assigned.png',
          selectedIconPath: 'images/assigned-active.png'
        },
        {
          pagePath: 'pages/manager/statistics/statistics',
          text: '统计',
          iconPath: 'images/statistics.png',
          selectedIconPath: 'images/statistics-active.png'
        }
      ]
    },
    'worker': {
      list: [
        {
          pagePath: 'pages/worker/index/index',
          text: '首页',
          iconPath: 'images/home.png',
          selectedIconPath: 'images/home-active.png'
        },
        {
          pagePath: 'pages/worker/tasks/tasks',
          text: '我的任务',
          iconPath: 'images/tasks.png',
          selectedIconPath: 'images/tasks-active.png'
        },
        {
          pagePath: 'pages/worker/history/history',
          text: '历史记录',
          iconPath: 'images/history.png',
          selectedIconPath: 'images/history-active.png'
        }
      ]
    }
  };
  
  return tabBars[role] || tabBars['client'];
}

/**
 * 页面权限检查装饰器
 * @param {string} requiredRole - 需要的角色
 * @param {function} pageFunction - 页面函数
 * @returns {function} 装饰后的页面函数
 */
function withPermission(requiredRole, pageFunction) {
  return function(options) {
    // 检查登录状态
    if (!isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    // 检查角色权限
    if (!checkPermission(requiredRole)) {
      wx.showModal({
        title: '权限不足',
        content: '您没有权限访问此页面',
        showCancel: false,
        success: () => {
          wx.navigateBack();
        }
      });
      return;
    }
    
    // 执行原页面函数
    return pageFunction.call(this, options);
  };
}

/**
 * 页面跳转权限检查
 * @param {string} url - 目标页面URL
 * @param {string} requiredRole - 需要的角色
 * @returns {boolean} 是否可以跳转
 */
function canNavigateTo(url, requiredRole) {
  if (!isLoggedIn()) {
    wx.redirectTo({
      url: '/pages/login/login'
    });
    return false;
  }
  
  if (!checkPermission(requiredRole)) {
    wx.showModal({
      title: '权限不足',
      content: '您没有权限访问此页面',
      showCancel: false
    });
    return false;
  }
  
  return true;
}

/**
 * 安全页面跳转
 * @param {string} url - 目标页面URL
 * @param {string} requiredRole - 需要的角色
 * @param {object} options - 跳转选项
 */
function safeNavigateTo(url, requiredRole, options = {}) {
  if (canNavigateTo(url, requiredRole)) {
    wx.navigateTo({
      url,
      ...options
    });
  }
}

/**
 * 安全页面重定向
 * @param {string} url - 目标页面URL
 * @param {string} requiredRole - 需要的角色
 * @param {object} options - 跳转选项
 */
function safeRedirectTo(url, requiredRole, options = {}) {
  if (canNavigateTo(url, requiredRole)) {
    wx.redirectTo({
      url,
      ...options
    });
  }
}

/**
 * 安全页面重启
 * @param {string} url - 目标页面URL
 * @param {string} requiredRole - 需要的角色
 * @param {object} options - 跳转选项
 */
function safeReLaunch(url, requiredRole, options = {}) {
  if (canNavigateTo(url, requiredRole)) {
    wx.reLaunch({
      url,
      ...options
    });
  }
}

module.exports = {
  checkPermission,
  getUserInfo,
  getUserRole,
  isLoggedIn,
  getHomePageByRole,
  getTabBarByRole,
  withPermission,
  canNavigateTo,
  safeNavigateTo,
  safeRedirectTo,
  safeReLaunch
};

