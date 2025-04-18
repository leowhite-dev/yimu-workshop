/**
 * i18n.js - 国际化模块
 * 提供多语言支持和翻译功能
 */

const I18n = {
  // 当前语言
  currentLang: 'zh',
  
  // 语言包
  locales: {
    zh: {
      // index.html - Header & Navigation
      pageTitle: "一木记账工坊 - 非官方工具集合",
      mainHeading: "一木记账工坊",
      subHeading: "非官方工具集合",
      tabAbout: "关于",
      tabFeature1: "导入格式调整",
      tabFeature2: "功能2",
      tabFeature3: "功能3",
  
      // index.html - About Tab
      aboutHeading: "介绍",
      aboutParagraph1: "<strong>一木记账工坊</strong>是一个由第三方开发者开发的<strong>开源工具集合</strong>，旨在为<a href=\"https://www.yimuapp.com\" target=\"_blank\">一木记账</a>用户提供额外的功能支持。",
      importantDisclaimerHeading: "⚠ 重要声明",
      importantDisclaimerText: "本项目与杭州一木宇宙科技有限责任公司<strong>无关</strong>，所有工具均由个人开发，未经官方审查。请<strong>不要</strong>向官方团队反馈本项目的 bug 或问题。如有任何反馈，请联系 <a href=\"mailto:leowhite.devspace@gmail.com\">leowhite.devspace@gmail.com</a> 或在 GitHub 提交 issue 和 PR。您的意见和反馈十分重要。",
      projectBackgroundHeading: "项目背景",
      projectBackgroundText: "在使用一木记账时，开发者发现某些功能尚未满足自己的使用场景，认为这些功能可以通过自己开发来快速实现临时解决方案，因此开发了这个工具集合。名称灵感来源于 Steam 创意工坊，旨在从插件角度为一木记账提供第三方辅助支持。",
      securityStatementHeading: "安全声明",
      securityStatementText: "为保护用户数据安全，本项目的所有工具均基于<strong>不联网</strong>的原则开发，尽量降低数据泄露风险。欢迎通过代码审查、流量监控等方式进行监督，如发现问题请及时反馈。",
      roadmapHeading: "目前开发计划",
      supportedPlatformsHeading: "支持平台",
      platformIOS: "<strong>iOS</strong>：开发者目前仅使用 iOS 设备，代码完全支持 iOS 端一木记账应用。",
      platformAndroidHarmony: "<strong>Android &amp; HarmonyOS</strong>：功能与 iOS 端无差异的部分可兼容。",
      plannedFeaturesHeading: "计划中的功能",
      featureBillImport: "<strong>批量导入账单格式调整</strong>：帮助用户快速格式化账单数据，方便导入一木记账。",
      featureDataVisualization: "<strong>软件导出账单的数据可视化</strong>：提供账单数据的可视化分析功能。",
      featureMultiPlatformRecognition: "<strong>多平台账单识别模型</strong>：开发模型以识别和处理多平台的账单数据。",
      featurePlanNote: "<strong>注意</strong>：以上功能仅为初步计划，不具备强执行约束。",
      contributionHeading: "贡献与反馈",
      contributionIntro: "我们欢迎任何形式的贡献，包括但不限于：",
      contributionType1: "代码提交",
      contributionType2: "功能建议",
      contributionType3: "bug 报告",
      contributionWays: "你可以通过以下方式参与：",
      contributionWay1: "在 GitHub 提交 <a href=\"https://github.com/leowhite-dev/yimu-workshop/issues\" target=\"_blank\">Issue</a> 或 <a href=\"https://github.com/leowhite-dev/yimu-workshop/pulls\" target=\"_blank\">Pull Request</a>",
      contributionWay2: "通过 <a href=\"mailto:leowhite.devspace@gmail.com\">leowhite.devspace@gmail.com</a> 联系开发者",
      contributionThanks: "感谢你的支持！",
  
      // index.html - Feature 1 Tab
      feature1Heading: "批量导入账单格式调整",
      feature1Description: "该功能帮助用户快速格式化账单数据，方便导入一木记账。",
      uploadCSVButton: "上传CSV文件",
      dropFilesHere: "拖放文件到此处",
      orClickButton: "或点击上方按钮选择文件",
      uploadHintWeChat: "支持微信支付导出的CSV账单文件",
      featureDescriptionHeading: "功能描述", // Shared key, might need adjustment if content differs significantly per feature
      feature1DetailsDescription: "一键处理微信支付导出的账单CSV文件，自动将不同类型的交易分类整理。",
      usageMethodHeading: "使用方法",
      usageStep1: "点击\"上传CSV文件\"按钮选择从微信支付导出的账单文件",
      usageStep2: "系统将自动处理文件并立即下载处理结果",
      usageStep3: "下载的ZIP文件中包含两个CSV文件：转账账单和收支账单",
      processingContentHeading: "处理内容",
      processDetail1: "自动移除账单文件上方的描述性文本",
      processDetail2: "自动将交易记录分为转账账单和收支账单",
      processDetail3: "保留原始数据格式，便于导入一木记账",
  
      // index.html - Feature 2 Tab
      feature2Heading: "软件导出账单的数据可视化",
      feature2Description: "提供账单数据的可视化分析功能，帮助用户更好地理解消费模式。",
      feature2DetailsDescription: "将一木记账导出的数据转换为直观的图表和报表，提供超出原生应用的深度分析功能。",
      visualizationTypesHeading: "可视化类型",
      vizType1: "消费趋势分析图表",
      vizType2: "分类支出比例图",
      vizType3: "月度收支对比",
      vizType4: "自定义报表导出",
  
      // index.html - Feature 3 Tab
      feature3Heading: "多平台账单识别模型",
      feature3Description: "开发模型以识别和处理多平台的账单数据，提高记账效率。",
      feature3DetailsDescription: "通过识别模型自动解析不同平台的账单格式，减少手动输入的工作量。",
      supportedPlatformsF3Heading: "支持平台", // Different key than About section's support platform
      platformBank: "各大银行电子账单",
      platformAlipay: "支付宝账单",
      platformWeChatPay: "微信支付记录",
      platformCreditCard: "信用卡账单",
  
      // index.html - Footer
      footerCopyright: "&copy; 2025 一木记账工坊 - 开源项目",
      footerContact: "致信",
  
      // script.js messages
      processing: "处理中...",
      errorFileTypeNotSupported: (type) => `文件类型不支持: ${type}。请上传CSV文件`,
      errorFileExtensionNotSupported: (ext) => `文件扩展名不支持: ${ext}。请上传CSV文件`,
      errorFileSizeExceeded: (sizeMB) => `文件过大: ${sizeMB}MB。最大支持10MB`,
      errorFileContentMismatch: "文件内容不符合微信支付账单格式",
      errorFileContentValidationFailed: (message) => `文件内容验证失败: ${message}`,
      errorFileReadFailed: "读取文件失败",
      creatingZip: "正在创建ZIP文件...",
      filePrefix: (dateStr) => `一木记账工坊-微信${dateStr}-`,
      processingTransferRecords: "正在处理转账记录...",
      csvHeaderTransfer: "日期,转出账户,转入账户,金额,手续费,备注", // Header for transfer CSV
      csvDateHeaderPartial: "日期", // Used for header checking
      transferBillFileName: "转账账单", // Part of the output file name
      processingTransactionRecords: "正在处理收支记录...", // Loading message
      csvHeaderTransaction: "日期,收支类型,金额,类别,子类,所属账本,收支账户,备注,标签", // Header for transaction CSV
      csvTransactionTimeHeaderPartial: "交易时间", // Used for header checking
      transactionBillFileName: "收支账单", // Part of the output file name
      generatingZip: "正在生成ZIP文件...", // Loading message
      processedBillZipName: "处理后的账单", // Part of the output ZIP file name
      processingSuccessNotification: (fileName, transferCount, transactionCount) => `处理完成！已生成 ${fileName}。共处理 ${transferCount} 条转账记录和 ${transactionCount} 条交易记录。`, // Success notification
      errorZipGenerationFailed: (message) => `创建ZIP文件失败: ${message}`,
      errorZipCreationFailedGeneral: (message) => `ZIP文件处理过程中出错: ${message}`,
      warningAlreadyProcessing: "正在处理文件，请稍候...", // Warning notification
      loadingValidatingFile: "正在验证文件...", // Loading message
      loadingReadingFile: "正在读取文件...", // Loading message
      errorWebWorkerNotSupported: "浏览器不支持后台处理，无法继续操作。", // Error notification
      loadingProcessingFile: "正在处理文件...", // Loading message (used also for worker start)
      errorProcessingFailed: (error) => `处理失败: ${error}`,
      errorWorkerGeneral: (message) => `处理线程发生错误: ${message}`,
      errorValidationFailed: (message) => `处理失败: ${message}`, // Combined validation/reading/general processing error
      processingComplete: "处理完成，正在准备下载...", // Loading message
      sendingDataToWorker: "正在发送数据到处理线程..." // Loading message
    }
    // Add other languages here in the future, e.g., en: { ... }
  },
  
  /**
   * 获取翻译文本
   * @param {string} key 翻译键
   * @param {...any} args 替换参数
   * @returns {string} 翻译后的文本
   */
  translate: function(key, ...args) {
    const lang = this.currentLang;
    let template = this.locales[lang]?.[key];
    
    if (typeof template === 'function') {
      return template(...args);
    }
    
    if (typeof template === 'string') {
      // 基本占位符替换 (例如, "Hello {0}")
      let result = template;
      args.forEach((arg, index) => {
        const placeholder = new RegExp(`\\{\\s*${index}\\s*\\}`, 'g');
        result = result.replace(placeholder, arg);
      });
      return result;
    }
    
    console.warn(`Translation key "${key}" not found for language "${lang}"`);
    return key; // 回退到键名
  },
  
  /**
   * 应用翻译到DOM
   */
  applyTranslations: function() {
    document.querySelectorAll('[data-translate]').forEach(element => {
      const key = element.getAttribute('data-translate');
      const translation = this.translate(key);
      
      if (element.hasAttribute('data-translate-html')) {
        // 对于包含HTML标签的元素使用innerHTML
        element.innerHTML = translation;
      } else if (element.tagName === 'TITLE') {
        // 单独处理title标签
        document.title = translation;
      } else {
        // 对于纯文本元素使用textContent
        element.textContent = translation;
      }
    });
  },
  
  /**
   * 设置当前语言
   * @param {string} lang 语言代码
   * @returns {boolean} 是否设置成功
   */
  setLanguage: function(lang) {
    if (this.locales[lang]) {
      this.currentLang = lang;
      this.applyTranslations();
      return true;
    }
    return false;
  }
};

// 简化的访问方法
const t = I18n.translate.bind(I18n);
