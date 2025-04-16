/**
 * logger.js - 系统日志记录工具
 * 提供不同级别的日志记录功能，可以全局控制日志输出
 */

const Logger = {
  // 日志级别: 0=关闭, 1=错误, 2=警告, 3=信息, 4=调试
  level: 4,
  isDebugMode: false,
  
  /**
   * 记录调试级别的日志
   * @param {string} message 日志消息
   * @param {any} data 附加数据（可选）
   */
  debug: function(message, data) {
    if (this.level >= 4 && this.isDebugMode) {
      console.log(`%c[DEBUG] ${message}`, 'color: #6c757d', data || '');
    }
  },
  
  /**
   * 记录信息级别的日志
   * @param {string} message 日志消息
   * @param {any} data 附加数据（可选）
   */
  info: function(message, data) {
    if (this.level >= 3) {
      console.info(`%c[INFO] ${message}`, 'color: #0d6efd', data || '');
    }
  },
  
  /**
   * 记录警告级别的日志
   * @param {string} message 日志消息
   * @param {any} data 附加数据（可选）
   */
  warn: function(message, data) {
    if (this.level >= 2) {
      console.warn(`%c[WARN] ${message}`, 'color: #ffc107', data || '');
    }
  },
  
  /**
   * 记录错误级别的日志
   * @param {string} message 日志消息
   * @param {Error|any} error 错误对象或附加数据（可选）
   */
  error: function(message, error) {
    if (this.level >= 1) {
      console.error(`%c[ERROR] ${message}`, 'color: #dc3545', error || '');
    }
  },
  
  /**
   * 记录性能计时开始
   * @param {string} label 计时标签
   */
  timeStart: function(label) {
    if (this.level >= 3 && this.isDebugMode) {
      console.time(`⏱️ ${label}`);
    }
  },
  
  /**
   * 记录性能计时结束
   * @param {string} label 计时标签
   */
  timeEnd: function(label) {
    if (this.level >= 3 && this.isDebugMode) {
      console.timeEnd(`⏱️ ${label}`);
    }
  },
  
  /**
   * 设置调试模式
   * @param {boolean} isEnabled 是否启用调试模式
   */
  setDebugMode: function(isEnabled) {
    this.isDebugMode = isEnabled;
    this.info(`调试模式${isEnabled ? '已启用' : '已禁用'}`);
    
    // 在控制台中显示调试模式状态
    if (isEnabled) {
      console.log('%c🔍 调试模式已启用', 'background: #28a745; color: white; padding: 2px 5px; border-radius: 3px;');
    }
  },
  
  /**
   * 设置日志级别
   * @param {number} level 日志级别 (0-4)
   */
  setLevel: function(level) {
    if (level >= 0 && level <= 4) {
      this.level = level;
      const levelNames = ['关闭', '错误', '警告', '信息', '调试'];
      this.info(`日志级别设置为: ${levelNames[level]}`);
    } else {
      this.error(`无效的日志级别: ${level}，应为0-4之间的整数`);
    }
  },
  
  /**
   * 分组日志开始
   * @param {string} label 分组标签
   */
  group: function(label) {
    if (this.isDebugMode) {
      console.group(label);
    }
  },
  
  /**
   * 分组日志结束
   */
  groupEnd: function() {
    if (this.isDebugMode) {
      console.groupEnd();
    }
  }
};

// 默认情况下，生产环境禁用调试模式和详细日志
if (window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')) {
  Logger.level = 2; // 仅显示警告和错误
  Logger.isDebugMode = false;
}