# 一木记账工坊 - 代码逻辑文档

本文档详细说明一木记账工坊项目的代码逻辑和执行流程，帮助开发者理解代码的组织方式和工作原理。

## 目录

1. [整体代码结构](#1-整体代码结构)
2. [核心执行流程](#2-核心执行流程)
3. [关键函数说明](#3-关键函数说明)
4. [数据处理逻辑](#4-数据处理逻辑)
5. [Web Worker通信](#5-web-worker通信)
6. [错误处理机制](#6-错误处理机制)
7. [国际化实现](#7-国际化实现)
8. [调试与日志系统](#8-调试与日志系统)

## 1. 整体代码结构

项目代码主要分为以下几个部分：

### 1.1 HTML结构 (src/index.html)

HTML文件定义了应用的基本结构，包括：
- 侧边栏导航（标签页切换）
- 内容区域（各功能的UI）
- 通知容器（显示操作结果）
- 脚本引用（加载JS文件）

### 1.2 核心脚本 (src/core/app.js)

主要JavaScript文件，包含：
- 事件监听器设置
- 文件处理逻辑
- Web Worker创建和通信
- UI交互处理
- ZIP文件生成和下载

### 1.3 内联Web Worker (src/core/script.js中的workerCode)

后台处理线程，负责：
- CSV文件解析
- 数据分类和处理
- 结果格式化
- 进度报告

### 1.4 工具模块

- **src/utils/locales.js**: 国际化文本和翻译函数
- **src/utils/logger.js**: 日志记录和性能计时
- **src/utils/debug-tools.js**: 调试模式和调试面板
- **src/utils/optimized-functions.js**: 优化的CSV处理函数

### 1.5 测试模块 (tests/unit/tests.js)

包含自动化测试用例，用于验证核心功能。

## 2. 核心执行流程

应用的主要执行流程如下：

### 2.1 初始化流程

1. 页面加载完成后，触发DOMContentLoaded事件
2. 初始化标签页导航
3. 设置文件上传按钮和拖放区域事件监听器
4. 检查是否启用调试模式
5. 创建通知容器

### 2.2 文件处理流程

1. 用户上传CSV文件（点击按钮或拖放）
2. 验证文件类型、大小和内容格式
3. 读取文件内容
4. 创建Web Worker处理CSV数据
5. 接收Worker处理结果
6. 创建ZIP文件并触发下载
7. 显示处理结果通知

## 3. 关键函数说明

### 3.1 UI相关函数

```javascript
// 显示加载指示器
const showLoading = (message = t('processing')) => {
    // 创建加载覆盖层和旋转器
    // 显示加载消息
}

// 隐藏加载指示器
const hideLoading = () => {
    // 添加淡出动画
    // 移除加载覆盖层
    // 终止Worker
}

// 显示通知
const showNotification = (message, type = 'success', duration = 5000) => {
    // 创建通知元素
    // 添加到通知容器
    // 设置自动消失定时器
}
```

### 3.2 文件处理函数

```javascript
// 验证CSV文件
const validateCSVFile = (file) => {
    // 检查文件类型和扩展名
    // 检查文件大小
    // 读取文件前1000个字符验证内容
}

// 处理CSV文件
const processCSVFile = (file) => {
    // 显示加载指示器
    // 验证文件
    // 读取文件内容
    // 创建Worker处理数据
}

// 创建并下载ZIP文件
const createAndDownloadZip = (transferRecords, transactionRecords, originalFileName) => {
    // 创建JSZip实例
    // 添加转账记录CSV文件
    // 添加交易记录CSV文件
    // 生成ZIP文件
    // 创建下载链接并触发下载
}
```

## 4. 数据处理逻辑

### 4.1 CSV预处理

```javascript
// 预处理CSV内容
const preprocessCSV = (csvContent) => {
    // 分割内容为行
    // 查找并移除描述性文本
    // 返回处理后的行数组
}
```

### 4.2 CSV行解析

```javascript
// 解析CSV行
const parseCSVLine = (line) => {
    // 初始化字段数组
    // 使用状态机解析CSV
    // 处理引号、逗号和转义字符
    // 返回字段数组
}
```

### 4.3 记录分类

```javascript
// 将记录分类为转账记录和交易记录
const categorizeRecords = (lines) => {
    // 初始化结果数组
    // 遍历每一行
    // 根据字段特征分类记录
    // 重新格式化字段
    // 返回分类结果
}
```

### 4.4 备注处理

```javascript
// 处理备注文本
const processNoteText = (text) => {
    // 处理特殊情况
    // 去掉两端引号
    // 处理连续引号和转义字符
    // 将英文逗号替换为中文逗号
}

// 提取备注文本
const extractNoteText = (_, fields) => {
    // 检查是否是转账类型
    // 根据记录类型提取备注
    // 合并转账对象和备注
}
```

## 5. Web Worker通信

### 5.1 创建Worker

```javascript
// 创建Worker
const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);
currentWorker = new Worker(workerUrl);
```

### 5.2 消息处理

```javascript
// 主线程发送消息
currentWorker.postMessage({
    type: 'process',
    data: { csvContent }
});

// 主线程接收消息
currentWorker.onmessage = ({ data: { type, data } }) => {
    if (type === 'progress') {
        // 更新进度
    } else if (type === 'result') {
        // 处理结果
    } else if (type === 'error') {
        // 处理错误
    }
};

// Worker接收消息
self.addEventListener('message', function(e) {
    const { type, data } = e.data;
    if (type === 'process') {
        // 处理数据
    }
});

// Worker发送消息
self.postMessage({
    type: 'progress',
    data: { stage: 'preprocessing', progress: 50 }
});
```

## 6. 错误处理机制

### 6.1 Promise错误处理

```javascript
validateCSVFile(file)
    .then(csvContent => {
        // 处理数据
    })
    .catch(error => {
        // 显示错误通知
        // 记录错误日志
        // 隐藏加载指示器
    });
```

### 6.2 Worker错误处理

```javascript
// Worker错误事件
currentWorker.onerror = (error) => {
    // 记录错误日志
    // 显示错误通知
    // 终止Worker
    // 释放资源
};

// Worker内部错误处理
try {
    // 处理数据
} catch (error) {
    self.postMessage({
        type: 'error',
        data: { message: '处理CSV文件时出错: ' + error.message }
    });
}
```

## 7. 国际化实现

### 7.1 翻译文本定义

```javascript
const locales = {
  zh: {
    // 各种翻译键值对
    processing: "处理中...",
    errorFileTypeNotSupported: (type) => `文件类型不支持: ${type}。请上传CSV文件`,
    // 更多翻译...
  }
  // 其他语言...
};
```

### 7.2 翻译函数

```javascript
// 获取翻译文本
function t(key, ...args) {
  const lang = 'zh'; // 默认语言
  let template = locales[lang]?.[key];

  // 处理函数类型的翻译
  if (typeof template === 'function') {
    return template(...args);
  }

  // 处理字符串类型的翻译
  if (typeof template === 'string') {
    let result = template;
    args.forEach((arg, index) => {
      const placeholder = new RegExp(`\\{\\s*${index}\\s*\\}`, 'g');
      result = result.replace(placeholder, arg);
    });
    return result;
  }

  // 回退到键名
  return key;
}
```

## 8. 调试与日志系统

### 8.1 日志级别

```javascript
const Logger = {
  // 日志级别: 0=关闭, 1=错误, 2=警告, 3=信息, 4=调试
  level: 4,
  isDebugMode: false,

  // 各种日志方法
  debug: function(message, data) { /* ... */ },
  info: function(message, data) { /* ... */ },
  warn: function(message, data) { /* ... */ },
  error: function(message, data) { /* ... */ },

  // 性能计时
  timeStart: function(label) { /* ... */ },
  timeEnd: function(label) { /* ... */ }
};
```

### 8.2 调试模式

```javascript
// 初始化调试工具
const DebugTools = {
  initialize: function() {
    // 检查URL参数和localStorage
    // 设置Logger的调试模式
    // 添加调试UI
  },

  addDebugUI: function() {
    // 创建调试面板
    // 添加控制按钮
    // 添加事件监听器
  }
};
```

---

本文档详细说明了一木记账工坊项目的代码逻辑和执行流程。通过理解这些核心概念，开发者可以更容易地理解、维护和扩展项目代码。如有任何问题或建议，请参考[贡献指南](../development/DEVELOPER.md)提交反馈。