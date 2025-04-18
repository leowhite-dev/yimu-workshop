/**
 * ui.js - UI组件模块
 * 提供用户界面相关的功能，如加载指示器、通知系统和标签页导航
 */

const UI = {
  // 状态变量
  state: {
    isProcessing: false
  },

  /**
   * 加载指示器
   */
  loading: {
    /**
     * 显示加载指示器
     * @param {string} message 加载消息
     */
    show: function(message = t('processing')) {
      if (document.getElementById('loading-overlay')) {
        this.updateMessage(message);
        return;
      }

      UI.state.isProcessing = true;

      const overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.className = 'loading-overlay';

      const spinner = document.createElement('div');
      spinner.className = 'spinner';

      const messageEl = document.createElement('p');
      messageEl.id = 'loading-message';
      messageEl.textContent = message;

      overlay.appendChild(spinner);
      overlay.appendChild(messageEl);
      document.body.appendChild(overlay);
    },

    /**
     * 隐藏加载指示器
     */
    hide: function() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
          overlay.parentNode?.removeChild(overlay);
          UI.state.isProcessing = false;
        }, 500);
      } else {
        UI.state.isProcessing = false;
      }
    },

    /**
     * 更新加载消息
     * @param {string} message 新的加载消息
     */
    updateMessage: function(message) {
      const messageEl = document.getElementById('loading-message');
      if (messageEl) {
        messageEl.textContent = message;
      }
    }
  },

  /**
   * 通知系统
   */
  notification: {
    /**
     * 显示通知
     * @param {string} message 通知消息
     * @param {string} type 通知类型 (success, error, warning, info)
     * @param {number} duration 显示时长 (毫秒)
     * @returns {HTMLElement} 通知元素
     */
    show: function(message, type = 'success', duration = 5000) {
      let container = document.getElementById('notification-container');
      if (!container) {
        container = this.createContainer();
      }

      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;

      const sanitizedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      notification.textContent = sanitizedMessage;

      container.appendChild(notification);

      // 添加 show 类以触发动画
      setTimeout(() => {
        notification.classList.add('show');
      }, 10);

      if (duration > 0) {
        setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => {
            notification.parentNode?.removeChild(notification);
          }, 300);
        }, duration);
      }

      return notification;
    },

    /**
     * 创建通知容器
     * @returns {HTMLElement} 通知容器元素
     */
    createContainer: function() {
      let container = document.getElementById('notification-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
      }
      return container;
    }
  },

  /**
   * 标签页导航
   */
  tabs: {
    /**
     * 初始化标签页导航
     */
    init: function() {
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabContents = document.querySelectorAll('.tab-content');

      tabButtons.forEach(button => {
        button.addEventListener('click', function() {
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabContents.forEach(content => content.classList.remove('active'));

          this.classList.add('active');

          const tabId = this.getAttribute('data-tab');
          const tabContent = document.getElementById(tabId);

          if (tabContent) {
            tabContent.classList.add('active');
            Logger.info(`切换到标签: ${tabId}`);
          } else {
            Logger.error(`找不到对应的内容区域: ${tabId}`);
            UI.notification.show(`找不到对应的内容区域: ${tabId}`, 'error');
          }
        });
      });

      // 默认激活第一个标签
      if (tabButtons.length > 0 && !document.querySelector('.tab-button.active')) {
        tabButtons[0].click();
      }
    },

    /**
     * 切换到指定标签
     * @param {string} tabId 标签ID
     */
    switchTo: function(tabId) {
      const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
      if (tabButton) {
        tabButton.click();
      } else {
        Logger.error(`找不到标签: ${tabId}`);
      }
    }
  },

  /**
   * 文件上传区域
   */
  dropZone: {
    /**
     * 初始化拖放区域
     * @param {Function} onFileSelected 文件选择回调函数
     */
    init: function(onFileSelected) {
      const uploadBtn = document.querySelector('.upload-btn');
      const fileInput = document.getElementById('csv-file-input');
      const dropZone = document.querySelector('.upload-area') || document.body;

      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => {
          if (UI.state.isProcessing) {
            UI.notification.show(t('warningAlreadyProcessing'), 'info');
            return;
          }
          fileInput.click();
        });

        fileInput.addEventListener('change', (event) => {
          const file = event.target.files[0];
          if (file) {
            Logger.debug('上传文件:', file.name);
            onFileSelected(file);
          }
        });

        if (dropZone && dropZone !== document.body) {
          dropZone.addEventListener('click', () => {
            if (UI.state.isProcessing) {
              UI.notification.show(t('warningAlreadyProcessing'), 'info');
              return;
            }
            fileInput.click();
          });
        }

        const preventDefaults = (e) => {
          e.preventDefault();
          e.stopPropagation();
        };

        const handleDrop = (e) => {
          if (UI.state.isProcessing) {
            UI.notification.show(t('warningAlreadyProcessing'), 'info');
            return;
          }

          const dt = e.dataTransfer;
          const file = dt.files[0];

          if (file) {
            fileInput.files = dt.files;
            onFileSelected(file);
          }
        };

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
          dropZone.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
          dropZone.addEventListener(eventName, () => this.highlight(dropZone), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
          dropZone.addEventListener(eventName, () => this.unhighlight(dropZone), false);
        });

        dropZone.addEventListener('drop', handleDrop, false);
      }
    },

    /**
     * 高亮显示拖放区域
     * @param {HTMLElement} dropZone 拖放区域元素
     */
    highlight: function(dropZone) {
      dropZone.classList.add('highlight');
    },

    /**
     * 取消高亮显示拖放区域
     * @param {HTMLElement} dropZone 拖放区域元素
     */
    unhighlight: function(dropZone) {
      dropZone.classList.remove('highlight');
    }
  }
};
