# 一木记账工坊 - 开发者指南

本文档为开发者提供参与一木记账工坊项目开发的详细指南，包括环境设置、代码规范、开发流程和贡献指南。

## 目录

1. [开发环境设置](#1-开发环境设置)
2. [项目结构详解](#2-项目结构详解)
3. [核心模块开发指南](#3-核心模块开发指南)
4. [调试与测试](#4-调试与测试)
5. [贡献流程](#5-贡献流程)
6. [代码规范](#6-代码规范)
7. [常见问题解答](#7-常见问题解答)

## 1. 开发环境设置

### 1.1 基本要求

- 现代浏览器（Chrome、Firefox、Safari、Edge等）
- 文本编辑器或IDE（推荐VS Code、WebStorm等）
- Git版本控制工具

### 1.2 本地开发环境设置

1. 克隆仓库：
   ```bash
   git clone https://github.com/leowhite-dev/yimu-workshop.git
   cd yimu-workshop
   ```

2. 启动本地服务器（可选）：

   由于项目是纯前端项目，可以直接在浏览器中打开`index.html`文件。但为了更好的开发体验，建议使用本地服务器：

   使用Python内置服务器：
   ```bash
   # Python 3
   python -m http.server 8000
   ```

   或使用Node.js的http-server：
   ```bash
   npm install -g http-server
   http-server -p 8000
   ```

3. 访问开发环境：

   打开浏览器，访问 `http://localhost:8000`

### 1.3 开发模式

在URL中添加`?debug=true`参数可以启用调试模式，例如：`http://localhost:8000/index.html?debug=true`

## 2. 项目结构详解

### 2.1 核心文件说明

- **index.html**: 主页面，包含UI结构和基本布局
- **assets/css/style.css**: 样式定义，包含所有UI组件的样式
- **assets/js/core/script.js**: 主要JavaScript逻辑，处理用户交互和功能实现，包含内联的Web Worker代码
- **assets/js/utils/locales.js**: 国际化文本定义，支持多语言
- **assets/js/utils/logger.js**: 日志工具，提供不同级别的日志记录
- **assets/js/utils/debug-tools.js**: 调试工具，提供调试功能和测试运行
- **assets/js/utils/optimized-functions.js**: 优化的功能函数，提供高性能实现
- **assets/js/tests/tests.js**: 测试脚本，包含自动化测试用例

### 2.2 功能模块关系

```
index.html
  ├── 加载 style.css
  ├── 加载 locales.js
  ├── 加载 logger.js
  ├── 加载 debug-tools.js
  ├── 加载 tests.js
  └── 加载 script.js
      └── 创建 Web Worker (使用内联代码)
```

### 2.3 数据流向

1. 用户上传CSV文件
2. script.js验证文件并读取内容
3. 创建内联Web Worker并发送数据
4. Web Worker处理数据并返回结果
5. script.js接收结果并创建ZIP文件
6. 用户下载处理后的文件

## 3. 核心模块开发指南

### 3.1 UI组件开发

项目使用原生HTML和CSS构建UI，遵循以下原则：

- 使用语义化HTML标签
- 使用CSS类名前缀避免冲突
- 使用Flexbox和Grid进行布局
- 实现响应式设计，适配不同设备

添加新UI组件的步骤：

1. 在index.html中添加HTML结构
2. 在style.css中添加相应样式
3. 在script.js中添加事件处理逻辑
4. 在locales.js中添加相关文本

### 3.2 CSV处理逻辑开发

CSV处理逻辑位于script.js文件中的内联Web Worker代码中，遵循以下原则：

- 使用模块化设计，每个函数负责单一功能
- 使用注释说明复杂逻辑
- 实现进度报告，提供处理状态反馈
- 处理各种边缘情况和错误

修改或扩展CSV处理逻辑的步骤：

1. 了解现有处理流程和数据结构
2. 在script.js中找到并修改workerCode字符串中的相关函数
3. 更新消息处理逻辑
4. 添加测试用例验证功能

### 3.3 Web Worker通信

Web Worker通信采用消息传递机制，消息格式如下：

从主线程到Worker：
```javascript
{
  type: 'process',  // 消息类型
  data: {
    csvContent: '...'  // CSV内容
  }
}
```

从Worker到主线程：
```javascript
{
  type: 'progress',  // 进度消息
  data: {
    stage: 'preprocessing',  // 处理阶段
    progress: 50  // 进度百分比
  }
}
```

```javascript
{
  type: 'result',  // 结果消息
  data: {
    transferRecords: [...],  // 转账记录
    transactionRecords: [...]  // 交易记录
  }
}
```

```javascript
{
  type: 'error',  // 错误消息
  data: {
    message: '...'  // 错误信息
  }
}
```

### 3.4 国际化开发

添加新语言或文本的步骤：

1. 在locales.js中的locales对象中添加新的键值对
2. 对于带参数的文本，使用函数形式：
   ```javascript
   errorFileTypeNotSupported: (type) => `文件类型不支持: ${type}。请上传CSV文件`
   ```
3. 使用t()函数获取翻译文本：
   ```javascript
   const message = t('errorFileTypeNotSupported', fileType);
   ```

## 4. 调试与测试

### 4.1 启用调试模式

在URL中添加`?debug=true`参数启用调试模式，或在localStorage中设置：
```javascript
localStorage.setItem('debugMode', 'true');
```

### 4.2 使用调试面板

调试模式下会显示调试面板，提供以下功能：

- 设置日志级别
- 运行测试
- 清除控制台
- 禁用调试模式

### 4.3 日志记录

使用Logger对象记录不同级别的日志：

```javascript
Logger.debug('调试信息', data);  // 仅在调试模式下显示
Logger.info('信息', data);       // 一般信息
Logger.warn('警告', data);       // 警告信息
Logger.error('错误', error);     // 错误信息
```

### 4.4 性能计时

使用Logger的计时功能测量性能：

```javascript
Logger.timeStart('操作名称');
// 执行操作
Logger.timeEnd('操作名称');  // 显示操作耗时
```

### 4.5 运行测试

在调试面板中点击"运行测试"按钮，或直接调用：

```javascript
runTests();
```

### 4.6 添加测试用例

在tests.js中添加新的测试函数，并在runTests()中调用：

```javascript
function testNewFeature() {
  Logger.group('新功能测试');

  try {
    // 测试代码
    if (expectedResult === actualResult) {
      Logger.info('✅ 测试通过');
    } else {
      Logger.error('❌ 测试失败', { expected: expectedResult, actual: actualResult });
    }
  } catch (error) {
    Logger.error('❌ 测试出错', error);
  }

  Logger.groupEnd();
}
```

## 5. 贡献流程

### 5.1 提交Issue

在提交Issue前，请先搜索是否已存在相同或类似的Issue。提交Issue时，请提供以下信息：

- 问题描述或功能建议
- 复现步骤（如适用）
- 预期行为和实际行为
- 浏览器和操作系统信息
- 相关截图或日志

### 5.2 提交Pull Request

1. Fork仓库并创建新分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. 进行开发和测试

3. 提交代码，使用清晰的提交信息：
   ```bash
   git commit -m "feat: 添加新功能"
   ```

4. 推送到你的Fork仓库：
   ```bash
   git push origin feature/your-feature-name
   ```

5. 创建Pull Request，详细描述你的更改

### 5.3 代码审查

所有Pull Request都会经过代码审查，可能会要求进行修改。请及时响应审查意见并进行必要的更新。

## 6. 代码规范

### 6.1 JavaScript规范

- 使用ES6+语法
- 使用const和let，避免使用var
- 使用箭头函数表示匿名函数
- 使用模板字符串代替字符串拼接
- 使用解构赋值简化代码
- 使用Promise和async/await处理异步操作
- 使用适当的注释说明复杂逻辑

### 6.2 HTML规范

- 使用HTML5语义化标签
- 使用data-*属性存储自定义数据
- 使用适当的ARIA属性提高可访问性
- 使用lang属性指定语言

### 6.3 CSS规范

- 使用类选择器，避免ID选择器
- 使用BEM命名约定（Block__Element--Modifier）
- 使用CSS变量定义主题颜色和尺寸
- 使用媒体查询实现响应式设计

### 6.4 命名约定

- **JavaScript变量和函数**：使用驼峰命名法（camelCase）
- **CSS类**：使用连字符分隔（kebab-case）
- **常量**：使用大写字母和下划线（UPPER_SNAKE_CASE）
- **文件名**：使用连字符分隔（kebab-case）

## 7. 常见问题解答

### 7.1 如何添加新功能？

1. 在index.html中添加新的标签页和内容区域
2. 在locales.js中添加相关的翻译文本
3. 在script.js中实现功能逻辑
4. 如需后台处理，创建新的Web Worker或扩展现有Worker
5. 添加相关的测试用例

### 7.2 如何修复Bug？

1. 在调试模式下重现Bug
2. 使用Logger记录相关信息
3. 分析问题原因
4. 修改代码并测试
5. 提交Pull Request

### 7.3 如何优化性能？

- 使用Web Worker处理耗时操作
- 避免在主线程中进行大量数据处理
- 使用增量处理方式处理大文件
- 减少DOM操作，避免频繁重排和重绘
- 使用防抖和节流技术处理频繁事件

### 7.4 如何处理大文件？

- 使用增量处理方式，分批处理数据
- 实现处理进度反馈
- 考虑使用流式处理方法
- 优化内存使用，避免一次性加载大量数据

---

感谢您对一木记账工坊项目的贡献！如有任何问题，请通过GitHub Issues或邮件联系项目维护者。