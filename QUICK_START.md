# ⚡ 快速开始 - 5分钟修复维修工任务问题

## 🎯 问题
主管分配任务后，维修工看不到任务。

## ✅ 解决方案
已修改为使用**手机号**匹配，更可靠！

---

## 📝 3步操作

### 第1步：部署云函数（1分钟）

1. 打开微信开发者工具
2. 找到左侧文件树 `cloud/functions/issues`
3. **右键** > 选择"**上传并部署：不安装依赖**"
4. 等待提示"上传成功"

> ✅ 完成！云函数已更新

---

### 第2步：修复历史任务（2分钟）

**如果之前没有分配过任务，可以跳过这一步**

1. 在微信开发者工具底部，打开"**控制台**"（Console 标签）

2. 复制下面的脚本，粘贴到控制台：

```javascript
(async function() {
  console.log('🔧 开始修复历史任务...\n');
  
  try {
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 获取所有已分配的任务
    const issuesResult = await db.collection('issues').where({
      status: _.in(['assigned', 'processing', 'resolved']),
      assignedWorkerId: _.exists(true)
    }).get();
    
    const issues = issuesResult.data;
    console.log('📋 找到', issues.length, '个已分配的任务\n');
    
    if (issues.length === 0) {
      console.log('✅ 没有需要修复的任务');
      return;
    }
    
    // 获取所有维修工
    const workersResult = await db.collection('users').where({
      role: 'worker'
    }).get();
    
    const workers = workersResult.data;
    const workerMap = {};
    workers.forEach(w => { workerMap[w._id] = w.phone; });
    
    // 修复任务
    let fixed = 0;
    for (const issue of issues) {
      if (issue.assignedWorkerPhone) continue;  // 已有手机号，跳过
      
      const phone = workerMap[issue.assignedWorkerId];
      if (!phone) continue;  // 找不到维修工，跳过
      
      await db.collection('issues').doc(issue._id).update({
        data: { assignedWorkerPhone: phone }
      });
      
      fixed++;
      console.log(`✅ 修复: ${issue.title}`);
    }
    
    console.log('\n========================================');
    console.log('✅ 修复完成！共修复', fixed, '个任务');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
})();
```

3. 按 **Enter** 执行

4. 等待看到"修复完成"提示

> ✅ 完成！历史任务已修复

---

### 第3步：测试（2分钟）

#### A. 主管端测试

1. 登录主管账号
2. 进入"待处理问题"页面
3. 点击任意问题的"分配"按钮
4. 选择一个维修工
5. 点击"确定"
6. 应该看到"任务分配成功"

#### B. 维修工端测试

1. 登录维修工账号
2. 进入"我的任务"页面
3. 下拉刷新
4. **应该能看到刚刚分配的任务了！** 🎉

> ✅ 完成！问题已解决

---

## 🔍 如何确认成功？

### ✅ 成功的标志：

1. 云函数上传成功（看到"上传成功"提示）
2. 修复脚本显示"修复完成"
3. 主管分配任务后，提示"分配成功"
4. 维修工刷新后，能看到任务列表
5. 任务卡片显示正确的信息

### ❌ 如果还有问题：

1. **查看云函数日志**
   - 云开发 > 云函数 > issues > 日志
   - 查找带有 ✅ 或 ❌ 的日志

2. **运行诊断脚本**
   - 打开 `test-worker-task-assignment.js`
   - 按照说明运行测试

3. **查看详细文档**
   - 打开 `DEPLOYMENT_GUIDE.md`
   - 按照完整步骤排查

---

## 💡 关键改进

### 改进前
```
查询条件: { assignedWorkerId: "user_abc123" }
问题: 用户 ID 可能会变化，导致匹配失败
```

### 改进后
```
查询条件: { assignedWorkerPhone: "13800138003" }
优势: 手机号唯一且不变，匹配更可靠
```

---

## 📱 联系支持

如果按照上述步骤操作后还有问题，请提供：

1. **云函数日志截图**（特别是带 ❌ 的错误）
2. **维修工的手机号**
3. **任务分配的截图**

这样可以更快地帮您解决问题！

---

**祝使用顺利！** 🚀



