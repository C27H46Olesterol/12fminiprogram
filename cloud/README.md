# 颐尔福售后系统 - 后端服务

## 📋 项目概述

颐尔福售后系统是一个基于微信小程序的售后服务管理平台，提供完整的工单管理、用户管理、文件上传、统计报表等功能。

## 🏗️ 技术架构

- **前端**: 微信小程序
- **后端**: 微信云开发 (云函数 + 云数据库)
- **存储**: 微信云存储
- **认证**: 微信登录

## 📁 项目结构

```
cloud/
├── functions/           # 云函数目录
│   ├── auth/           # 用户认证服务
│   ├── issues/          # 工单管理服务
│   ├── upload/          # 文件上传服务
│   ├── statistics/      # 统计报表服务
│   ├── notifications/   # 消息通知服务
│   └── faq/            # FAQ管理服务
├── database/           # 数据库相关
│   └── schema.js       # 数据库结构定义
├── api/                # API路由
│   └── index.js        # 路由配置
├── init-database.js    # 数据库初始化脚本
├── test-apis.js       # API测试脚本
├── deploy.sh          # 部署脚本
└── package.json       # 项目配置
```

## 🚀 快速开始

### 1. 环境准备

- 安装微信开发者工具
- 安装 Node.js (版本 >= 14)
- 安装 wx-server-sdk

```bash
npm install -g @cloudbase/cli
```

### 2. 配置云开发环境

1. 在微信开发者工具中创建云开发环境
2. 获取环境ID
3. 配置云函数环境

### 3. 部署云函数

```bash
# 进入项目目录
cd cloud

# 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

### 4. 初始化数据库

```bash
# 在微信开发者工具中运行
# 云函数: init-database
```

### 5. 测试API

```bash
# 在微信开发者工具中运行
# 云函数: test-apis
```

## 📚 API文档

### 认证相关

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/auth/wx-login` | POST | 微信登录 |
| `/api/auth/get-user-info` | GET | 获取用户信息 |
| `/api/auth/update-user-info` | PUT | 更新用户信息 |
| `/api/auth/change-user-role` | PUT | 修改用户角色 |

### 工单管理

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/feedback` | POST | 提交反馈 |
| `/api/feedback/:id/progress` | GET | 查询反馈进度 |
| `/api/issues/pending` | GET | 获取待处理问题 |
| `/api/issues/assigned` | GET | 获取已分配问题 |
| `/api/issues/resolved` | GET | 获取已解决问题 |
| `/api/issues/:id` | GET | 获取问题详情 |
| `/api/issues/:id/priority` | PUT | 设置问题优先级 |
| `/api/issues/:id/assign` | PUT | 分配维修工 |

### 文件上传

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/upload/image` | POST | 上传图片 |
| `/api/upload/document` | POST | 上传文档 |
| `/api/upload/:id/info` | GET | 获取文件信息 |
| `/api/upload/:id/delete` | DELETE | 删除文件 |
| `/api/upload/my-files` | GET | 获取我的文件列表 |

### 统计报表

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/statistics` | GET | 获取统计数据 |
| `/api/statistics/worker-performance` | GET | 获取维修工绩效 |
| `/api/statistics/customer-satisfaction` | GET | 获取客户满意度 |
| `/api/statistics/issue-trend` | GET | 获取工单趋势 |

### 消息通知

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/notifications` | GET | 获取通知列表 |
| `/api/notifications/:id/read` | PUT | 标记通知为已读 |
| `/api/notifications/mark-all-read` | PUT | 批量标记为已读 |
| `/api/notifications/unread-count` | GET | 获取未读通知数量 |

### FAQ管理

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/faq` | GET | 获取FAQ列表 |
| `/api/faq/:id` | GET | 获取FAQ详情 |
| `/api/faq/categories` | GET | 获取FAQ分类 |
| `/api/faq/popular` | GET | 获取热门FAQ |
| `/api/faq/search` | GET | 搜索FAQ |

## 🗄️ 数据库设计

### 用户表 (users)
- 存储用户基本信息、角色、权限等

### 问题工单表 (issues)
- 存储工单信息、状态、处理记录等

### 工单状态历史表 (issueStatusHistory)
- 记录工单状态变更历史

### FAQ表 (faqs)
- 存储常见问题和答案

### 系统配置表 (configs)
- 存储系统配置参数

### 消息通知表 (notifications)
- 存储用户通知消息

### 文件上传记录表 (uploads)
- 记录文件上传信息

## 🔧 配置说明

### 环境变量

```javascript
// 在云函数中配置
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV_ID
});
```

### 权限配置

系统支持以下角色：
- `client`: 客户
- `worker`: 维修工
- `manager`: 主管
- `admin`: 管理员

### 文件上传配置

- 图片最大大小: 5MB
- 文档最大大小: 10MB
- 支持格式: jpg, png, gif, webp, pdf, doc, docx, xls, xlsx, txt

## 🧪 测试

### 运行测试套件

```bash
# 在微信开发者工具中运行
# 云函数: test-apis
```

### 测试覆盖

- ✅ 用户认证API
- ✅ 工单管理API
- ✅ 文件上传API
- ✅ 统计报表API
- ✅ 消息通知API
- ✅ FAQ管理API

## 📊 监控和日志

### 云函数日志

在微信开发者工具的云开发控制台中查看：
- 云函数调用日志
- 错误日志
- 性能监控

### 数据库监控

- 集合使用情况
- 查询性能
- 存储空间使用

## 🚀 部署和发布

### 1. 云函数部署

```bash
# 部署单个云函数
wx-server-sdk deploy auth

# 部署所有云函数
./deploy.sh
```

### 2. 数据库初始化

```bash
# 运行初始化脚本
# 云函数: init-database
```

### 3. 小程序发布

1. 在微信开发者工具中上传代码
2. 提交审核
3. 审核通过后发布

## 🔒 安全考虑

### 数据安全
- 用户数据加密存储
- 敏感信息脱敏
- 定期数据备份

### 接口安全
- 用户身份验证
- 权限控制
- 请求频率限制

### 文件安全
- 文件类型验证
- 文件大小限制
- 恶意文件检测

## 📈 性能优化

### 数据库优化
- 合理设计索引
- 查询优化
- 分页查询

### 云函数优化
- 代码压缩
- 依赖优化
- 缓存策略

### 文件存储优化
- 图片压缩
- CDN加速
- 懒加载

## 🐛 故障排除

### 常见问题

1. **云函数调用失败**
   - 检查环境ID配置
   - 查看云函数日志
   - 验证参数格式

2. **数据库连接失败**
   - 检查数据库权限
   - 验证查询语句
   - 查看错误日志

3. **文件上传失败**
   - 检查文件大小限制
   - 验证文件类型
   - 查看存储权限

### 调试技巧

1. 使用云函数日志
2. 本地调试模式
3. 断点调试
4. 性能分析

## 📞 技术支持

如有问题，请联系：
- 邮箱: support@yierfu.com
- 电话: 400-123-4567
- 微信: yierfu_support

## 📄 许可证

MIT License

## 🔄 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 完整的工单管理功能
- 用户认证和权限管理
- 文件上传和存储
- 统计报表功能
- 消息通知系统
- FAQ管理系统








