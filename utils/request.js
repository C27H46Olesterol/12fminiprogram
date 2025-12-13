// utils/request.js - 网络请求工具
const app = getApp();

/**
 * 网络请求封装
 * @param {object} options - 请求选项
 * @returns {Promise} 请求结果
 */
function request(options) {
  return new Promise((resolve, reject) => {
    // 显示加载提示
    if (options.showLoading !== false) {
      wx.showLoading({
        title: options.loadingText || '加载中...',
        mask: true
      });
    }

    wx.request({
      url: app.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': app.globalData.userInfo ? app.globalData.userInfo.token : '',
        ...options.header
      },
      success: (res) => {
        // 隐藏加载提示
        if (options.showLoading !== false) {
          wx.hideLoading();
        }

        // 处理响应
        if (res.statusCode === 200) {
          // 成功响应
          if (res.data.code === 0) {
            resolve(res.data);
          } else {
            // 业务错误
            const errorMsg = res.data.message || '请求失败';
            if (options.showError !== false) {
              wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 2000
              });
            }
            reject(new Error(errorMsg));
          }
        } else if (res.statusCode === 401) {
          // 未授权，跳转到登录页
          wx.showModal({
            title: '登录过期',
            content: '请重新登录',
            showCancel: false,
            success: () => {
              app.logout();
            }
          });
          reject(new Error('登录过期'));
        } else {
          // 其他HTTP错误
          const errorMsg = `请求失败 (${res.statusCode})`;
          if (options.showError !== false) {
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          }
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        // 隐藏加载提示
        if (options.showLoading !== false) {
          wx.hideLoading();
        }

        // 网络错误
        const errorMsg = '网络连接失败，请检查网络设置';
        if (options.showError !== false) {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
        reject(err);
      }
    });
  });
}

/**
 * GET请求
 * @param {string} url - 请求URL
 * @param {object} data - 请求参数
 * @param {object} options - 请求选项
 * @returns {Promise} 请求结果
 */
function get(url, data = {}, options = {}) {
  return request({
    url,
    method: 'GET',
    data,
    ...options
  });
}

/**
 * POST请求
 * @param {string} url - 请求URL
 * @param {object} data - 请求参数
 * @param {object} options - 请求选项
 * @returns {Promise} 请求结果
 */
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
}

/**
 * PUT请求
 * @param {string} url - 请求URL
 * @param {object} data - 请求参数
 * @param {object} options - 请求选项
 * @returns {Promise} 请求结果
 */
function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
}

/**
 * DELETE请求
 * @param {string} url - 请求URL
 * @param {object} data - 请求参数
 * @param {object} options - 请求选项
 * @returns {Promise} 请求结果
 */
function del(url, data = {}, options = {}) {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  });
}

/**
 * 文件上传
 * @param {string} url - 上传URL
 * @param {string} filePath - 文件路径
 * @param {object} formData - 表单数据
 * @param {object} options - 上传选项
 * @returns {Promise} 上传结果
 */
function uploadFile(url, filePath, formData = {}, options = {}) {
  return new Promise((resolve, reject) => {
    // 显示上传进度
    if (options.showProgress !== false) {
      wx.showLoading({
        title: '上传中...',
        mask: true
      });
    }

    wx.uploadFile({
      url: app.globalData.baseUrl + url,
      filePath,
      name: options.name || 'file',
      formData: {
        ...formData,
        token: app.globalData.userInfo ? app.globalData.userInfo.token : ''
      },
      success: (res) => {
        // 隐藏上传进度
        if (options.showProgress !== false) {
          wx.hideLoading();
        }

        try {
          const data = JSON.parse(res.data);
          if (data.code === 0) {
            resolve(data);
          } else {
            const errorMsg = data.message || '上传失败';
            if (options.showError !== false) {
              wx.showToast({
                title: errorMsg,
                icon: 'none',
                duration: 2000
              });
            }
            reject(new Error(errorMsg));
          }
        } catch (err) {
          const errorMsg = '上传失败';
          if (options.showError !== false) {
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          }
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        // 隐藏上传进度
        if (options.showProgress !== false) {
          wx.hideLoading();
        }

        const errorMsg = '上传失败，请重试';
        if (options.showError !== false) {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
        reject(err);
      }
    });
  });
}

/**
 * 文件下载
 * @param {string} url - 下载URL
 * @param {object} options - 下载选项
 * @returns {Promise} 下载结果
 */
function downloadFile(url, options = {}) {
  return new Promise((resolve, reject) => {
    // 显示下载进度
    if (options.showProgress !== false) {
      wx.showLoading({
        title: '下载中...',
        mask: true
      });
    }

    wx.downloadFile({
      url: app.globalData.baseUrl + url,
      header: {
        'Authorization': app.globalData.userInfo ? app.globalData.userInfo.token : '',
        ...options.header
      },
      success: (res) => {
        // 隐藏下载进度
        if (options.showProgress !== false) {
          wx.hideLoading();
        }

        if (res.statusCode === 200) {
          resolve(res);
        } else {
          const errorMsg = '下载失败';
          if (options.showError !== false) {
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 2000
            });
          }
          reject(new Error(errorMsg));
        }
      },
      fail: (err) => {
        // 隐藏下载进度
        if (options.showProgress !== false) {
          wx.hideLoading();
        }

        const errorMsg = '下载失败，请重试';
        if (options.showError !== false) {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
        reject(err);
      }
    });
  });
}

module.exports = {
  request,
  get,
  post,
  put,
  del,
  uploadFile,
  downloadFile
};

