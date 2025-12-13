// utils/validate.js - 表单验证工具

/**
 * 验证手机号
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
function validatePhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证邮箱
 * @param {string} email - 邮箱
 * @returns {boolean} 是否有效
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 验证身份证号
 * @param {string} idCard - 身份证号
 * @returns {boolean} 是否有效
 */
function validateIdCard(idCard) {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return idCardRegex.test(idCard);
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {object} 验证结果
 */
function validatePassword(password) {
  const result = {
    isValid: false,
    strength: 0,
    message: ''
  };

  if (!password) {
    result.message = '密码不能为空';
    return result;
  }

  if (password.length < 6) {
    result.message = '密码长度不能少于6位';
    return result;
  }

  if (password.length > 20) {
    result.message = '密码长度不能超过20位';
    return result;
  }

  // 计算密码强度
  let strength = 0;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  result.strength = strength;
  result.isValid = true;

  if (strength < 2) {
    result.message = '密码强度较弱，建议包含字母和数字';
  } else if (strength < 3) {
    result.message = '密码强度中等';
  } else {
    result.message = '密码强度较强';
  }

  return result;
}

/**
 * 验证URL
 * @param {string} url - URL
 * @returns {boolean} 是否有效
 */
function validateUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证数字
 * @param {string|number} value - 值
 * @param {object} options - 选项
 * @returns {object} 验证结果
 */
function validateNumber(value, options = {}) {
  const result = {
    isValid: false,
    message: ''
  };

  if (value === '' || value === null || value === undefined) {
    result.message = '请输入数字';
    return result;
  }

  const num = Number(value);
  if (isNaN(num)) {
    result.message = '请输入有效的数字';
    return result;
  }

  if (options.min !== undefined && num < options.min) {
    result.message = `数值不能小于${options.min}`;
    return result;
  }

  if (options.max !== undefined && num > options.max) {
    result.message = `数值不能大于${options.max}`;
    return result;
  }

  if (options.integer && !Number.isInteger(num)) {
    result.message = '请输入整数';
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * 验证文本长度
 * @param {string} text - 文本
 * @param {object} options - 选项
 * @returns {object} 验证结果
 */
function validateTextLength(text, options = {}) {
  const result = {
    isValid: false,
    message: ''
  };

  const length = text ? text.length : 0;

  if (options.required && length === 0) {
    result.message = '此项为必填项';
    return result;
  }

  if (options.min && length < options.min) {
    result.message = `长度不能少于${options.min}个字符`;
    return result;
  }

  if (options.max && length > options.max) {
    result.message = `长度不能超过${options.max}个字符`;
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * 验证必填项
 * @param {any} value - 值
 * @param {string} fieldName - 字段名
 * @returns {object} 验证结果
 */
function validateRequired(value, fieldName = '此项') {
  const result = {
    isValid: false,
    message: ''
  };

  if (value === '' || value === null || value === undefined) {
    result.message = `${fieldName}为必填项`;
    return result;
  }

  if (typeof value === 'string' && value.trim() === '') {
    result.message = `${fieldName}不能为空`;
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * 验证日期
 * @param {string} date - 日期
 * @param {object} options - 选项
 * @returns {object} 验证结果
 */
function validateDate(date, options = {}) {
  const result = {
    isValid: false,
    message: ''
  };

  if (!date) {
    result.message = '请选择日期';
    return result;
  }

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    result.message = '请输入有效的日期';
    return result;
  }

  if (options.min && dateObj < new Date(options.min)) {
    result.message = `日期不能早于${options.min}`;
    return result;
  }

  if (options.max && dateObj > new Date(options.max)) {
    result.message = `日期不能晚于${options.max}`;
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * 验证时间
 * @param {string} time - 时间
 * @param {object} options - 选项
 * @returns {object} 验证结果
 */
function validateTime(time, options = {}) {
  const result = {
    isValid: false,
    message: ''
  };

  if (!time) {
    result.message = '请选择时间';
    return result;
  }

  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(time)) {
    result.message = '请输入有效的时间格式';
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * 验证文件
 * @param {string} filePath - 文件路径
 * @param {object} options - 选项
 * @returns {object} 验证结果
 */
function validateFile(filePath, options = {}) {
  const result = {
    isValid: false,
    message: ''
  };

  if (!filePath) {
    result.message = '请选择文件';
    return result;
  }

  // 获取文件扩展名
  const ext = filePath.split('.').pop().toLowerCase();
  
  if (options.allowedTypes && !options.allowedTypes.includes(ext)) {
    result.message = `不支持的文件类型，支持的类型：${options.allowedTypes.join(', ')}`;
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * 表单验证器
 * @param {object} data - 表单数据
 * @param {object} rules - 验证规则
 * @returns {object} 验证结果
 */
function validateForm(data, rules) {
  const result = {
    isValid: true,
    errors: {}
  };

  for (const field in rules) {
    const fieldRules = rules[field];
    const value = data[field];

    for (const rule of fieldRules) {
      let validationResult;

      switch (rule.type) {
        case 'required':
          validationResult = validateRequired(value, rule.message || field);
          break;
        case 'phone':
          validationResult = { isValid: validatePhone(value), message: '请输入有效的手机号' };
          break;
        case 'email':
          validationResult = { isValid: validateEmail(value), message: '请输入有效的邮箱' };
          break;
        case 'password':
          validationResult = validatePassword(value);
          break;
        case 'number':
          validationResult = validateNumber(value, rule.options);
          break;
        case 'textLength':
          validationResult = validateTextLength(value, rule.options);
          break;
        case 'date':
          validationResult = validateDate(value, rule.options);
          break;
        case 'time':
          validationResult = validateTime(value, rule.options);
          break;
        case 'file':
          validationResult = validateFile(value, rule.options);
          break;
        case 'custom':
          validationResult = rule.validator(value, data);
          break;
        default:
          validationResult = { isValid: true, message: '' };
      }

      if (!validationResult.isValid) {
        result.isValid = false;
        result.errors[field] = validationResult.message;
        break;
      }
    }
  }

  return result;
}

module.exports = {
  validatePhone,
  validateEmail,
  validateIdCard,
  validatePassword,
  validateUrl,
  validateNumber,
  validateTextLength,
  validateRequired,
  validateDate,
  validateTime,
  validateFile,
  validateForm
};

