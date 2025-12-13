// cloud/database/schema.js - 数据库结构定义

/**
 * 数据库集合结构定义
 */
const collections = {
  // 用户表
  users: {
    _id: 'string', // 用户ID
    openid: 'string', // 微信openid
    unionid: 'string', // 微信unionid
    nickname: 'string', // 用户昵称
    avatar: 'string', // 头像URL
    phone: 'string', // 手机号
    role: 'string', // 角色: client, manager, worker, admin
    status: 'string', // 状态: active, inactive, banned
    permissions: 'array', // 权限列表
    department: 'string', // 部门
    position: 'string', // 职位
    // 位置信息字段
    region: 'string', // 地区（省-市-区）
    // 维修工评分统计字段（仅维修工角色使用）
    ratingCount: 'number', // 评价次数
    ratingSum: 'number', // 评分总和
    averageRating: 'number', // 平均评分（保留两位小数）
    lastRatingTime: 'date', // 最后一次被评价时间
    createTime: 'date', // 创建时间
    updateTime: 'date', // 更新时间
    lastLoginTime: 'date', // 最后登录时间
    loginCount: 'number' // 登录次数
  },

  // 问题工单表
  issues: {
    _id: 'string', // 工单ID
    issueId: 'string', // 工单编号
    title: 'string', // 问题标题
    description: 'string', // 问题描述
    category: 'string', // 问题分类
    priority: 'string', // 优先级: low, medium, high, urgent
    status: 'string', // 状态: pending, assigned, processing, resolved, closed
    clientId: 'string', // 客户ID
    clientName: 'string', // 客户姓名
    clientPhone: 'string', // 客户电话
    clientAddress: 'string', // 客户地址
    assignedWorkerId: 'string', // 分配的维修工ID
    assignedWorkerName: 'string', // 分配的维修工姓名
    assignedTime: 'date', // 分配时间
    processingTime: 'date', // 开始处理时间
    resolvedTime: 'date', // 解决时间
    closedTime: 'date', // 关闭时间
    attachments: 'array', // 附件列表
    images: 'array', // 图片列表
    processingRecords: 'array', // 处理记录
    resultDescription: 'string', // 处理结果描述
    satisfaction: 'number', // 满意度评分 1-5
    feedback: 'string', // 客户反馈
    createTime: 'date', // 创建时间
    updateTime: 'date', // 更新时间
    estimatedTime: 'number', // 预计处理时间(小时)
    actualTime: 'number' // 实际处理时间(小时)
  },

  // 工单状态历史表
  issueStatusHistory: {
    _id: 'string', // 记录ID
    issueId: 'string', // 工单ID
    status: 'string', // 状态
    operatorId: 'string', // 操作人ID
    operatorName: 'string', // 操作人姓名
    operatorRole: 'string', // 操作人角色
    remark: 'string', // 备注
    createTime: 'date' // 创建时间
  },

  // FAQ表
  faqs: {
    _id: 'string', // FAQ ID
    question: 'string', // 问题
    answer: 'string', // 答案
    category: 'string', // 分类
    priority: 'number', // 优先级
    viewCount: 'number', // 查看次数
    isActive: 'boolean', // 是否启用
    createTime: 'date', // 创建时间
    updateTime: 'date' // 更新时间
  },

  // 系统配置表
  configs: {
    _id: 'string', // 配置ID
    key: 'string', // 配置键
    value: 'any', // 配置值
    description: 'string', // 配置描述
    type: 'string', // 配置类型
    isActive: 'boolean', // 是否启用
    createTime: 'date', // 创建时间
    updateTime: 'date' // 更新时间
  },

  // 消息通知表
  notifications: {
    _id: 'string', // 通知ID
    userId: 'string', // 用户ID
    title: 'string', // 通知标题
    content: 'string', // 通知内容
    type: 'string', // 通知类型: system, issue, task
    relatedId: 'string', // 关联ID
    isRead: 'boolean', // 是否已读
    createTime: 'date', // 创建时间
    readTime: 'date' // 阅读时间
  },

  // 文件上传记录表
  uploads: {
    _id: 'string', // 文件ID
    fileName: 'string', // 文件名
    originalName: 'string', // 原始文件名
    filePath: 'string', // 文件路径
    fileSize: 'number', // 文件大小
    fileType: 'string', // 文件类型
    mimeType: 'string', // MIME类型
    uploaderId: 'string', // 上传者ID
    relatedId: 'string', // 关联ID
    relatedType: 'string', // 关联类型
    createTime: 'date' // 创建时间
  },

  // 产品激活记录表
  activateProduct: {
    _id: 'string', // 记录ID
    productCode: 'string', // 产品码
    licensePlate: 'string', // 车牌号
    userPhone: 'string', // 用户电话
    installerPhone: 'string', // 安装师傅电话
    processImages: 'array', // 安装过程图片ID列表
    finishImages: 'array', // 安装完成图片ID列表
    location: 'object', // 定位信息 {latitude, longitude, timestamp}
    submitTime: 'date', // 提交时间
    activationTime: 'date', // 激活时间
    status: 'string', // 状态: pending, activated, rejected
    submitterPhone: 'string', // 提交者电话
    submitterRole: 'string', // 提交者角色: user, client, worker
    userId: 'string', // 用户ID
    openId: 'string', // 微信openId
    createTime: 'date', // 创建时间
    updateTime: 'date' // 更新时间
  }
};

/**
 * 数据库索引定义
 */
const indexes = {
  users: [
    { openid: 1 },
    { unionid: 1 },
    { phone: 1 },
    { role: 1 },
    { status: 1 },
    { createTime: -1 }
  ],
  issues: [
    { issueId: 1 },
    { clientId: 1 },
    { assignedWorkerId: 1 },
    { status: 1 },
    { priority: 1 },
    { category: 1 },
    { createTime: -1 },
    { assignedTime: -1 },
    { resolvedTime: -1 }
  ],
  issueStatusHistory: [
    { issueId: 1 },
    { operatorId: 1 },
    { createTime: -1 }
  ],
  faqs: [
    { category: 1 },
    { priority: -1 },
    { isActive: 1 },
    { createTime: -1 }
  ],
  configs: [
    { key: 1 },
    { isActive: 1 }
  ],
  notifications: [
    { userId: 1 },
    { isRead: 1 },
    { type: 1 },
    { createTime: -1 }
  ],
  uploads: [
    { uploaderId: 1 },
    { relatedId: 1 },
    { relatedType: 1 },
    { createTime: -1 }
  ],
  activateProduct: [
    { productCode: 1 },
    { userPhone: 1 },
    { installerPhone: 1 },
    { status: 1 },
    { submitterPhone: 1 },
    { openId: 1 },
    { createTime: -1 },
    { activationTime: -1 }
  ]
};

/**
 * 初始化数据库
 */
async function initDatabase() {
  const db = cloud.database();
  
  // 创建集合
  for (const collectionName of Object.keys(collections)) {
    try {
      await db.createCollection(collectionName);
      console.log(`集合 ${collectionName} 创建成功`);
    } catch (error) {
      console.log(`集合 ${collectionName} 已存在或创建失败:`, error.message);
    }
  }

  // 创建索引
  for (const [collectionName, collectionIndexes] of Object.entries(indexes)) {
    try {
      const collection = db.collection(collectionName);
      for (const index of collectionIndexes) {
        await collection.createIndex(index);
        console.log(`集合 ${collectionName} 索引创建成功:`, index);
      }
    } catch (error) {
      console.log(`集合 ${collectionName} 索引创建失败:`, error.message);
    }
  }
}

module.exports = {
  collections,
  indexes,
  initDatabase
};








