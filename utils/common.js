// utils/common.js - 通用工具函数

/**
 * 格式化日期
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式
 * @returns {string} 格式化后的日期
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期
 * @param {string} format - 格式
 * @returns {string} 格式化后的时间
 */
function formatTime(date, format = 'HH:mm:ss') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 格式化相对时间
 * @param {Date|string|number} date - 日期
 * @returns {string} 相对时间
 */
function formatRelativeTime(date) {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化数字
 * @param {number} num - 数字
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的数字
 */
function formatNumber(num, decimals = 2) {
  if (isNaN(num)) return '0';
  
  return Number(num).toFixed(decimals);
}

/**
 * 格式化金额
 * @param {number} amount - 金额
 * @param {string} currency - 货币符号
 * @returns {string} 格式化后的金额
 */
function formatMoney(amount, currency = '¥') {
  if (isNaN(amount)) return currency + '0.00';
  
  return currency + Number(amount).toFixed(2);
}

/**
 * 防抖函数
 * @param {function} func - 要防抖的函数
 * @param {number} delay - 延迟时间
 * @returns {function} 防抖后的函数
 */
function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * 节流函数
 * @param {function} func - 要节流的函数
 * @param {number} delay - 延迟时间
 * @returns {function} 节流后的函数
 */
function throttle(func, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

/**
 * 深拷贝
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 生成唯一ID
 * @param {string} prefix - 前缀
 * @returns {string} 唯一ID
 */
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return prefix + timestamp + random;
}

/**
 * 获取URL参数
 * @param {string} url - URL
 * @returns {object} 参数对象
 */
function getUrlParams(url) {
  const params = {};
  const urlParts = url.split('?');
  if (urlParts.length > 1) {
    const queryString = urlParts[1];
    const pairs = queryString.split('&');
    pairs.forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
  }
  return params;
}

/**
 * 构建URL参数
 * @param {object} params - 参数对象
 * @returns {string} URL参数字符串
 */
function buildUrlParams(params) {
  const pairs = [];
  for (const key in params) {
    if (params.hasOwnProperty(key) && params[key] !== null && params[key] !== undefined) {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
    }
  }
  return pairs.join('&');
}

/**
 * 检查是否为空值
 * @param {any} value - 值
 * @returns {boolean} 是否为空
 */
function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * 获取随机颜色
 * @returns {string} 随机颜色
 */
function getRandomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * 计算两点间距离
 * @param {object} point1 - 点1
 * @param {object} point2 - 点2
 * @returns {number} 距离
 */
function calculateDistance(point1, point2) {
  const R = 6371; // 地球半径（公里）
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 数组去重
 * @param {Array} arr - 数组
 * @param {string} key - 去重字段
 * @returns {Array} 去重后的数组
 */
function uniqueArray(arr, key) {
  if (!key) {
    return [...new Set(arr)];
  }
  
  const seen = new Set();
  return arr.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 数组分组
 * @param {Array} arr - 数组
 * @param {string|function} key - 分组字段或函数
 * @returns {object} 分组后的对象
 */
function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
}

/**
 * 数组排序
 * @param {Array} arr - 数组
 * @param {string} key - 排序字段
 * @param {string} order - 排序方向
 * @returns {Array} 排序后的数组
 */
function sortArray(arr, key, order = 'asc') {
  return arr.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (order === 'desc') {
      return bVal > aVal ? 1 : -1;
    } else {
      return aVal > bVal ? 1 : -1;
    }
  });
}

module.exports = {
  formatDate,
  formatTime,
  formatRelativeTime,
  formatFileSize,
  formatNumber,
  formatMoney,
  debounce,
  throttle,
  deepClone,
  generateId,
  getUrlParams,
  buildUrlParams,
  isEmpty,
  getRandomColor,
  calculateDistance,
  uniqueArray,
  groupBy,
  sortArray
};

