# 一木记账工坊 - 系统架构文档

## 1. 项目概述

一木记账工坊是一个为[一木记账](https://www.yimuapp.com)用户提供辅助功能的开源工具集合。本项目采用纯前端实现，基于HTML、CSS和JavaScript构建，无需后端服务器支持，所有数据处理均在用户浏览器本地完成，确保用户数据安全。

### 1.1 项目目标

- 提供批量导入账单格式调整功能，简化用户导入流程
- 实现账单数据可视化分析
- 开发多平台账单识别模型
- 保持轻量级、高性能和易用性

### 1.2 技术栈

- **前端框架**：原生HTML、CSS和JavaScript (ES6+)
- **UI组件**：自定义组件，无依赖框架
- **数据处理**：Web Workers用于后台处理
- **文件处理**：JSZip用于ZIP文件生成
- **图标**：Font Awesome
- **字体**：Google Fonts (Noto Sans SC)

## 2. 系统架构

### 2.1 整体架构

项目采用模块化设计，主要分为以下几个部分：

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  用户界面 (UI)    |<--->|  核心功能模块     |<--->|  工具类和辅助功能  |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                               ^
                               |
                               v
                         +------------------+
                         |                  |
                         |  Web Worker      |
                         |  (后台处理)       |
                         |                  |
                         +------------------+
```

### 2.2 文件结构

```
yimu-workshop/
├── assets/
│   ├── css/
│   │   └── style.css          # 样式文件
│   ├── js/
│   │   ├── core/
│   │   │   └── script.js      # 主要功能实现的JavaScript脚本（包含内联Web Worker代码）
│   │   ├── utils/
│   │   │   ├── locales.js     # 国际化文本
│   │   │   ├── logger.js      # 日志工具
│   │   │   ├── debug-tools.js # 调试工具
│   │   │   └── optimized-functions.js # 优化的功能函数
│   │   └── tests/
│   │       └── tests.js       # 测试脚本
├── test/                      # 测试数据
├── index.html                 # 网页版工具入口
├── README.md                  # 项目说明文档
└── LICENSE                    # 许可证文件
```

## 3. 核心功能模块说明

### 3.1 用户界面 (index.html)

用户界面采用标签页设计，主要包含以下部分：

- **侧边栏导航**：提供功能标签切换
- **内容区域**：显示当前选中功能的详细内容和操作界面
- **通知系统**：显示操作结果和错误信息
- **加载指示器**：显示处理进度

界面设计遵循响应式原则，适配不同设备屏幕大小。

### 3.2 核心处理逻辑 (script.js)

主脚本负责以下功能：

- **事件处理**：处理用户交互事件，如文件上传、标签切换等
- **文件验证**：验证上传文件的类型、大小和内容格式
- **Web Worker管理**：创建、通信和终止后台处理线程
- **结果处理**：处理处理结果并生成下载文件
- **错误处理**：捕获和显示处理过程中的错误

### 3.3 CSV处理 (内联Web Worker)

CSV处理模块作为内联代码在Web Worker中运行，负责以下功能：

- **CSV预处理**：移除无关内容，准备数据处理
- **数据解析**：解析CSV行，处理引号、逗号等特殊字符
- **数据分类**：将记录分为转账记录和交易记录
- **数据格式化**：根据目标格式重新组织数据字段
- **进度报告**：向主线程报告处理进度

### 3.4 文件生成与下载

- **ZIP文件生成**：使用JSZip库将处理后的CSV文件打包
- **文件下载**：创建临时下载链接并触发下载

## 4. 数据流程图

```
+----------------+     +----------------+     +----------------+
|                |     |                |     |                |
|  用户上传CSV文件  |---->|  文件验证      |---->|  创建Web Worker|
|                |     |                |     |                |
+----------------+     +----------------+     +----------------+
                                                      |
                                                      v
+----------------+     +----------------+     +----------------+
|                |     |                |     |                |
|  下载ZIP文件    |<----|  创建ZIP文件    |<----|  CSV处理       |
|                |     |                |     |                |
+----------------+     +----------------+     +----------------+
```

## 5. 关键算法和处理逻辑

### 5.1 CSV解析算法

CSV解析采用状态机模式，处理以下情况：

- 引号内的逗号不作为字段分隔符
- 连续两个引号表示转义的引号字符
- 处理转义字符和特殊字符

```javascript
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                currentField += '"';
                i += 2;
            } else {
                inQuotes = !inQuotes;
                i++;
            }
        } else if (char === '\\') {
            currentField += char;
            i++;
            if (i < line.length) {
                currentField += line[i];
                i++;
            }
        } else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
            i++;
        } else {
            currentField += char;
            i++;
        }
    }

    fields.push(currentField);
    return fields;
}
```

### 5.2 记录分类逻辑

根据字段特征将记录分为转账记录和交易记录：

- **转账记录**：第5个字段包含"/"字符
- **交易记录**：其他记录

对于转账记录，重新组织为6列格式：
1. 日期
2. 转出账户
3. 转入账户
4. 金额
5. 手续费
6. 备注

对于交易记录，重新组织为9列格式：
1. 日期
2. 收支类型
3. 金额
4. 类别
5. 子类
6. 所属账本
7. 收支账户
8. 备注
9. 标签

### 5.3 备注处理逻辑

特殊处理转账类型记录的备注：

```javascript
function extractNoteText(_, fields) {
    let noteText = "";

    // 先检查是否是转账类型的记录
    if (fields.length > 1 && fields[1] === "转账" && fields.length > 3) {
        // 如果是转账类型，则合并第三列和第四列作为备注
        const recipient = fields.length > 2 ? processNoteText(fields[2]) : ""; // 第三列（转账对象）
        const comment = fields.length > 3 ? processNoteText(fields[3]) : "";   // 第四列（原备注）

        // 生成新的完整备注信息
        if (recipient) {
            noteText = '转给' + recipient + '，' + comment;
        } else {
            noteText = comment;
        }
    } else if (fields.length > 10) {
        // 如果不是转账类型，则备注在原本的第11列
        noteText = processNoteText(fields[10]);
    }

    return noteText;
}
```

### 5.4 逗号替换处理

为避免CSV格式问题，将备注中的英文逗号替换为中文逗号：

```javascript
function processNoteText(text) {
    if (!text || text === "/") return text;

    if (text.startsWith('"') && text.endsWith('"')) {
        text = text.substring(1, text.length - 1);
    }

    return text
        .replace(/""/g, '"')
        .replace(/\\(.)/g, '\\$1')
        .replace(/,/g, '，');  // 将英文逗号替换为中文逗号
}
```

## 6. 工具类和辅助功能

### 6.1 国际化 (locales.js)

提供多语言支持，目前实现中文语言包：

```javascript
const locales = {
  zh: {
    // 各种翻译键值对
  }
};

function t(key, ...args) {
  const lang = 'zh'; // 默认语言
  let template = locales[lang]?.[key];
  if (typeof template === 'function') {
    return template(...args);
  }
  if (typeof template === 'string') {
    let result = template;
    args.forEach((arg, index) => {
      const placeholder = new RegExp(`\\{\\s*${index}\\s*\\}`, 'g');
      result = result.replace(placeholder, arg);
    });
    return result;
  }
  return key; // 回退到键名
}
```

### 6.2 日志系统 (logger.js)

提供不同级别的日志记录功能：

- **debug**：调试级别日志，仅在调试模式下显示
- **info**：信息级别日志
- **warn**：警告级别日志
- **error**：错误级别日志
- **timeStart/timeEnd**：性能计时功能

### 6.3 调试工具 (debug-tools.js)

提供调试功能，通过URL参数`?debug=true`启用：

- **日志级别控制**：调整日志输出级别
- **测试运行**：运行内置测试
- **控制台清理**：清除控制台日志
- **状态显示**：显示系统状态信息

### 6.4 优化函数 (optimized-functions.js)

提供经过优化的常用函数，提高性能：

- **processNoteText**：处理备注文本
- **parseCSVLine**：解析CSV行
- **extractNoteText**：提取备注文本
- **processTransferInAccount**：处理转入账户
- **formatCSVField**：格式化CSV字段

## 7. 调试和测试机制

### 7.1 调试模式

通过URL参数`?debug=true`启用调试模式，提供以下功能：

- 显示详细日志
- 显示调试面板
- 提供测试运行功能
- 显示性能计时信息

### 7.2 测试框架 (tests.js)

提供简单的测试框架，测试以下功能：

- **CSV解析**：测试基本CSV分割和带引号的CSV解析
- **文件验证**：测试文件类型验证和文件内容验证
- **Web Worker**：测试Web Worker功能
- **国际化**：测试翻译功能

## 8. 扩展指南

### 8.1 添加新功能

添加新功能的步骤：

1. 在`index.html`中添加新的标签页和内容区域
2. 在`locales.js`中添加相关的翻译文本
3. 在`script.js`中实现功能逻辑
4. 如需后台处理，创建新的Web Worker或扩展现有Worker
5. 添加相关的测试用例

### 8.2 添加新语言

添加新语言支持的步骤：

1. 在`locales.js`中添加新的语言对象
2. 实现语言切换功能
3. 更新UI以显示语言选择器

### 8.3 性能优化建议

- 使用Web Worker处理耗时操作
- 避免在主线程中进行大量数据处理
- 使用增量处理方式处理大文件
- 实现处理进度反馈
- 优化DOM操作，减少重排和重绘

### 8.4 安全性考虑

- 所有文件处理在本地完成，不上传到服务器
- 验证文件类型和大小，防止恶意文件
- 对用户输入和文件内容进行安全处理，防止XSS攻击
- 使用安全的第三方库，定期更新依赖

## 9. 结语

本文档提供了一木记账工坊项目的系统架构和代码逻辑概述。开发者可以通过本文档了解项目的整体结构、核心功能和扩展方法。随着项目的发展，本文档将持续更新。

如有任何问题或建议，请通过GitHub Issues或邮件联系项目维护者。