# 一木记账工坊 - 非官方工具集合

## 介绍
**一木记账工坊**是一个由第三方开发者开发的**开源工具集合**，旨在为[一木记账](https://www.yimuapp.com)用户提供额外的功能支持。

> ⚠ **重要声明**：
> 本项目与杭州一木宇宙科技有限责任公司**无关**，所有工具均由个人开发，未经官方审查。请**不要**向官方团队反馈本项目的 bug 或问题。如有任何反馈，请联系 [leowhite.devspace@gmail.com](mailto:leowhite.devspace@gmail.com) 或在 GitHub 提交 issue 和 PR。您的意见和反馈十分重要。

## 项目背景
在使用一木记账时，开发者发现某些功能尚未满足自己的使用场景，认为这些功能可以通过自己开发来快速实现临时解决方案。因此，开发了这个工具集合，其名称灵感来源于 Steam 创意工坊，旨在从插件角度为一木记账提供第三方辅助支持。

## 安全声明
为保护用户数据安全，本项目的所有工具均基于**不联网**的原则开发，尽量降低数据泄露风险。欢迎通过代码审查、流量监控等方式进行监督，如发现问题请及时反馈。

## 目前开发计划

### 支持平台
- **iOS**：开发者目前仅使用 iOS 设备，代码完全支持 iOS 端一木记账应用。
- **Android & HarmonyOS**：功能与 iOS 端无差异的部分可兼容。

### 计划中的功能
- **批量导入账单格式调整**：帮助用户快速格式化账单数据，方便导入一木记账。
- **软件导出账单的数据可视化**：提供账单数据的可视化分析功能。
- **多平台账单识别模型**：开发模型以识别和处理多平台的账单数据。

> **注意**：
> 以上功能仅为初步计划，不具备强执行约束。

## 贡献与反馈
我们欢迎任何形式的贡献，包括但不限于：
- 代码提交
- 功能建议
- bug 报告

你可以通过以下方式参与：
- 在 GitHub 提交 [Issue](https://github.com/leowhite-dev/yimu-workshop/issues) 或 [Pull Request](https://github.com/leowhite-dev/yimu-workshop/pulls)
- 通过 [leowhite.devspace@gmail.com](mailto:leowhite.devspace@gmail.com) 联系开发者

感谢你的支持与参与！

## 项目结构
项目目录结构说明：

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

> **注意**：
> `.gitignore`配置了部分不加入版本控制的内容，请自行查看。

### 文件夹说明

- **assets/css/**: 存放所有样式文件
- **assets/js/core/**: 存放核心功能实现的JavaScript文件
- **assets/js/utils/**: 存放工具类JavaScript文件，如国际化、日志、调试工具等
- **assets/js/tests/**: 存放测试相关的JavaScript文件
- **test/**: 存放测试数据文件