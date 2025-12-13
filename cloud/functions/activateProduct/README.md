# activateProduct 云函数

产品激活管理云函数，提供完整的CRUD操作。

## 功能列表

### 1. 提交产品激活 (`submitProductActivation`)
创建新的产品激活记录。

**请求参数：**
```javascript
{
  action: 'submitProductActivation',
  productCode: '产品码',
  licensePlate: '车牌号',
  userPhone: '用户手机号',
  installerPhone: '安装师傅手机号',
  processImages: ['安装过程图片ID数组'],
  finishImages: ['安装完成图片ID数组'],
  location: { latitude, longitude, timestamp },
  submitTime: '提交时间',
  submitterPhone: '提交者手机号',
  submitterRole: '提交者角色'
}
```

**响应：**
```javascript
{
  success: true,
  data: { 激活记录数据 },
  message: '产品激活成功'
}
```

### 2. 检查产品激活状态 (`checkProductActivation`)
检查指定产品是否已激活。

**请求参数：**
```javascript
{
  action: 'checkProductActivation',
  productCode: '产品码'
}
```

**响应：**
```javascript
{
  success: true,
  data: {
    isActivated: true/false,
    activationTime: '激活时间',
    record: { 激活记录详情 }
  }
}
```

### 3. 根据产品码查询激活记录 (`getActivationByProductCode`)
查询指定产品的所有激活记录。

**请求参数：**
```javascript
{
  action: 'getActivationByProductCode',
  productCode: '产品码'
}
```

**响应：**
```javascript
{
  success: true,
  data: [激活记录数组],
  message: '查询成功'
}
```

### 4. 更新激活记录 (`updateActivation`)
更新指定产品的激活记录。

**请求参数：**
```javascript
{
  action: 'updateActivation',
  productCode: '产品码',
  updateData: { 要更新的字段 }
}
```

**响应：**
```javascript
{
  success: true,
  data: { 更新结果 },
  message: '更新成功'
}
```

### 5. 删除激活记录 (`deleteActivation`)
删除指定产品的激活记录。

**请求参数：**
```javascript
{
  action: 'deleteActivation',
  productCode: '产品码'
}
```

**响应：**
```javascript
{
  success: true,
  data: { 删除结果 },
  message: '删除成功'
}
```

### 6. 获取所有激活记录 (`getAllActivations`)
分页获取所有激活记录。

**请求参数：**
```javascript
{
  action: 'getAllActivations',
  page: 1,        // 页码，默认1
  pageSize: 20    // 每页大小，默认20
}
```

**响应：**
```javascript
{
  success: true,
  data: {
    list: [激活记录数组],
    total: 总数,
    page: 当前页,
    pageSize: 每页大小,
    totalPages: 总页数
  },
  message: '查询成功'
}
```

## 数据库结构

集合名：`activateProduct`

字段说明：
- `_id`: 记录ID
- `productCode`: 产品码
- `licensePlate`: 车牌号
- `userPhone`: 用户电话
- `installerPhone`: 安装师傅电话
- `processImages`: 安装过程图片ID列表
- `finishImages`: 安装完成图片ID列表
- `location`: 定位信息对象
- `submitTime`: 提交时间
- `activationTime`: 激活时间
- `status`: 状态 (pending/activated/rejected)
- `submitterPhone`: 提交者电话
- `submitterRole`: 提交者角色
- `userId`: 用户ID
- `openId`: 微信openId
- `createTime`: 创建时间
- `updateTime`: 更新时间

## 使用示例

```javascript
// 小程序端调用示例
wx.cloud.callFunction({
  name: 'activateProduct',
  data: {
    action: 'submitProductActivation',
    productCode: 'ABC123456',
    licensePlate: '浙A12345',
    userPhone: '13800138000',
    installerPhone: '13900139000',
    processImages: ['cloud://xxx/process.jpg'],
    finishImages: ['cloud://xxx/finish.jpg']
  },
  success: (res) => {
    console.log('激活成功:', res.result)
  },
  fail: (err) => {
    console.error('激活失败:', err)
  }
})
```

## 注意事项

1. 所有操作都会进行参数校验
2. 产品激活时会自动检查是否已激活，防止重复激活
3. 手机号格式会进行正则校验
4. 所有操作都有详细的错误处理和日志记录
5. 数据库操作包含事务处理，确保数据一致性
