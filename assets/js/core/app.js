/**
 * app.js - 应用初始化模块
 * 负责应用的初始化和主要功能的协调
 */

const App = {
  /**
   * 初始化应用
   */
  init: function() {
    document.addEventListener('DOMContentLoaded', () => {
      // 初始化调试工具
      const isDebugMode = DebugTools.initialize();
      
      // 如果在调试模式下，记录一些初始化信息
      if (isDebugMode) {
        Logger.info('应用初始化开始', {
          url: window.location.href,
          timestamp: new Date().toISOString()
        });
        Logger.timeStart('应用初始化');
      }
      
      // 初始化UI组件
      UI.notification.createContainer();
      UI.tabs.init();
      
      // 初始化文件上传区域
      UI.dropZone.init(this.handleFileUpload.bind(this));
      
      // 应用翻译
      I18n.applyTranslations();
      
      // 显示调试消息
      if (isDebugMode) {
        UI.notification.show('页面加载完成，点击左侧标签切换功能', 'info', 5000);
        Logger.timeEnd('应用初始化');
        Logger.info('应用初始化完成');
      }
    });
  },
  
  /**
   * 处理文件上传
   * @param {File} file 上传的文件
   */
  handleFileUpload: function(file) {
    CSVProcessor.processFile(file)
      .then(result => {
        Logger.info('文件处理成功', result);
      })
      .catch(error => {
        Logger.error('文件处理失败', error);
      });
  }
};

// 启动应用
App.init();
