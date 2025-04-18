/**
 * debug-tools.js - 调试工具集
 * 提供调试模式切换、调试UI和测试运行功能
 */

const DebugTools = {
  /**
   * 初始化调试工具
   * @returns {boolean} 是否启用了调试模式
   */
  initialize: function() {
    // 检查URL参数中是否有debug=true
    const urlParams = new URLSearchParams(window.location.search);
    const debugParam = urlParams.get('debug');

    // 检查localStorage中是否保存了调试设置
    const storedDebugSetting = localStorage.getItem('debugMode');

    // 如果URL参数或localStorage中有设置为true，则启用调试模式
    const isDebugMode = debugParam === 'true' || storedDebugSetting === 'true';

    // 设置Logger的调试模式
    Logger.setDebugMode(isDebugMode);

    // 如果启用了调试模式，添加调试UI
    if (isDebugMode) {
      this.addDebugUI();
    }

    return isDebugMode;
  },

  /**
   * 添加调试UI面板
   */
  addDebugUI: function() {
    // 创建调试面板
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.position = 'fixed';
    debugPanel.style.bottom = '10px';
    debugPanel.style.right = '10px';
    debugPanel.style.background = 'rgba(0,0,0,0.8)';
    debugPanel.style.color = 'white';
    debugPanel.style.padding = '10px';
    debugPanel.style.borderRadius = '5px';
    debugPanel.style.zIndex = '9999';
    debugPanel.style.fontFamily = 'monospace';
    debugPanel.style.fontSize = '12px';
    debugPanel.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    debugPanel.style.transition = 'all 0.3s ease';
    debugPanel.style.maxHeight = '300px';
    debugPanel.style.overflowY = 'auto';

    // 添加标题和控制按钮
    debugPanel.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-weight: bold;">🔍 调试模式</div>
        <div>
          <button id="debug-minimize" style="background: none; border: none; color: white; cursor: pointer; margin-left: 5px;">_</button>
          <button id="debug-close" style="background: none; border: none; color: white; cursor: pointer; margin-left: 5px;">×</button>
        </div>
      </div>
      <div id="debug-content">
        <div style="margin-bottom: 10px;">
          <label for="debug-log-level">日志级别:</label>
          <select id="debug-log-level" style="margin-left: 5px; background: #333; color: white; border: 1px solid #666;">
            <option value="0">关闭</option>
            <option value="1">错误</option>
            <option value="2">警告</option>
            <option value="3">信息</option>
            <option value="4" selected>调试</option>
          </select>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 5px;">
          <button id="debug-run-tests" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">运行测试</button>
          <button id="debug-clear-logs" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">清除控制台</button>
          <button id="debug-disable" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">禁用调试</button>
        </div>
        <div id="debug-status" style="margin-top: 10px; font-size: 11px; color: #aaa;"></div>
      </div>
    `;

    // 添加到文档
    document.body.appendChild(debugPanel);

    // 更新状态信息
    this.updateStatus();

    // 添加事件监听器
    this.addEventListeners();
  },

  /**
   * 为调试面板添加事件监听器
   */
  addEventListeners: function() {
    // 日志级别选择
    document.getElementById('debug-log-level').addEventListener('change', (e) => {
      const level = parseInt(e.target.value);
      Logger.setLevel(level);
      this.updateStatus();
    });

    // 运行测试按钮
    document.getElementById('debug-run-tests').addEventListener('click', () => {
      if (typeof runTests === 'function') {
        runTests();
      } else {
        Logger.error('测试模块未加载，无法运行测试');
      }
    });

    // 清除控制台按钮
    document.getElementById('debug-clear-logs').addEventListener('click', () => {
      console.clear();
      Logger.info('控制台已清除');
    });

    // 禁用调试按钮
    document.getElementById('debug-disable').addEventListener('click', () => {
      localStorage.setItem('debugMode', 'false');
      Logger.info('调试模式已禁用，页面将在3秒后刷新');
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    });

    // 最小化按钮
    document.getElementById('debug-minimize').addEventListener('click', () => {
      const content = document.getElementById('debug-content');
      if (content.style.display === 'none') {
        content.style.display = 'block';
        document.getElementById('debug-minimize').textContent = '_';
      } else {
        content.style.display = 'none';
        document.getElementById('debug-minimize').textContent = '□';
      }
    });

    // 关闭按钮
    document.getElementById('debug-close').addEventListener('click', () => {
      const panel = document.getElementById('debug-panel');
      panel.style.opacity = '0';
      setTimeout(() => {
        panel.remove();
      }, 300);
    });
  },

  /**
   * 更新调试面板状态信息
   */
  updateStatus: function() {
    const statusElement = document.getElementById('debug-status');
    if (statusElement) {
      const levelNames = ['关闭', '错误', '警告', '信息', '调试'];
      statusElement.innerHTML = `
        浏览器: ${navigator.userAgent.match(/Chrome|Firefox|Safari|Edge|Opera/)[0]}<br>
        日志级别: ${levelNames[Logger.level]}<br>
        页面加载时间: ${Math.round(performance.now())}ms
      `;
    }
  }
};