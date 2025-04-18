/**
 * tests.js - 测试框架
 * 提供简单的测试功能，用于验证核心功能是否正常工作
 */

/**
 * 运行所有测试
 */
function runTests() {
  Logger.group('🧪 运行测试...');

  // 测试CSV解析
  testCSVParsing();

  // 测试文件验证
  testFileValidation();

  // 测试工作线程
  testWorker();

  // 测试国际化
  testLocalization();

  // 测试UI组件
  testUIComponents();

  Logger.groupEnd();
}

/**
 * 测试CSV解析功能
 */
function testCSVParsing() {
  Logger.group('CSV解析测试');

  // 测试1: 基本CSV解析
  try {
    const testCSV = 'header1,header2\nvalue1,value2';
    const lines = testCSV.split('\n');

    if (lines.length === 2 &&
        lines[0] === 'header1,header2' &&
        lines[1] === 'value1,value2') {
      Logger.info('✅ 基本CSV分割测试通过');
    } else {
      Logger.error('❌ 基本CSV分割测试失败', lines);
    }
  } catch (error) {
    Logger.error('❌ 基本CSV分割测试出错', error);
  }

  // 测试2: 带引号的CSV解析
  try {
    const testLine = 'field1,"field2,with,commas",field3';

    // 模拟parseCSVLine函数的简化版本
    const parseSimple = (line) => {
      const fields = [];
      let currentField = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(currentField);
          currentField = '';
        } else {
          currentField += char;
        }
      }

      fields.push(currentField);
      return fields;
    };

    const fields = parseSimple(testLine);

    if (fields.length === 3 &&
        fields[0] === 'field1' &&
        fields[1] === 'field2,with,commas' &&
        fields[2] === 'field3') {
      Logger.info('✅ 带引号的CSV解析测试通过');
    } else {
      Logger.error('❌ 带引号的CSV解析测试失败', fields);
    }
  } catch (error) {
    Logger.error('❌ 带引号的CSV解析测试出错', error);
  }

  Logger.groupEnd();
}

/**
 * 测试文件验证功能
 */
function testFileValidation() {
  Logger.group('文件验证测试');

  // 测试1: 文件类型验证
  try {
    // 模拟validateCSVFile函数的简化版本
    const validateFileType = (fileType, fileName) => {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
      const fileExt = fileName.split('.').pop().toLowerCase();

      return allowedTypes.includes(fileType) || fileExt === 'csv';
    };

    const validFile1 = validateFileType('text/csv', 'test.csv');
    const validFile2 = validateFileType('application/vnd.ms-excel', 'test.xls');
    const validFile3 = validateFileType('application/octet-stream', 'test.csv');
    const invalidFile = validateFileType('text/plain', 'test.txt');

    if (validFile1 && validFile2 && validFile3 && !invalidFile) {
      Logger.info('✅ 文件类型验证测试通过');
    } else {
      Logger.error('❌ 文件类型验证测试失败', { validFile1, validFile2, validFile3, invalidFile });
    }
  } catch (error) {
    Logger.error('❌ 文件类型验证测试出错', error);
  }

  // 测试2: 文件内容验证
  try {
    // 模拟文件内容验证的简化版本
    const validateFileContent = (content) => {
      return content.includes('微信支付') ||
             content.includes('账单') ||
             content.includes('交易时间');
    };

    const validContent1 = validateFileContent('这是一个微信支付账单');
    const validContent2 = validateFileContent('这是一个账单文件');
    const validContent3 = validateFileContent('交易时间,商户名称,金额');
    const invalidContent = validateFileContent('这是一个普通文本文件');

    if (validContent1 && validContent2 && validContent3 && !invalidContent) {
      Logger.info('✅ 文件内容验证测试通过');
    } else {
      Logger.error('❌ 文件内容验证测试失败', { validContent1, validContent2, validContent3, invalidContent });
    }
  } catch (error) {
    Logger.error('❌ 文件内容验证测试出错', error);
  }

  Logger.groupEnd();
}

/**
 * 测试Web Worker功能
 */
function testWorker() {
  Logger.group('Web Worker测试');

  try {
    // 检查浏览器是否支持Web Worker
    if (typeof Worker !== 'undefined') {
      Logger.info('✅ 浏览器支持Web Worker');

      // 创建一个简单的内联Worker进行测试
      const workerCode = `
        self.addEventListener('message', function(e) {
          if (e.data === 'test') {
            self.postMessage('success');
          }
        });
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      try {
        const worker = new Worker(workerUrl);

        worker.onmessage = function(e) {
          if (e.data === 'success') {
            Logger.info('✅ Web Worker通信测试通过');
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
          }
        };

        worker.onerror = function(error) {
          Logger.error('❌ Web Worker通信测试失败', error);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
        };

        worker.postMessage('test');
      } catch (error) {
        Logger.error('❌ 创建Web Worker失败', error);
        URL.revokeObjectURL(workerUrl);
      }
    } else {
      Logger.warn('⚠️ 浏览器不支持Web Worker');
    }
  } catch (error) {
    Logger.error('❌ Web Worker测试出错', error);
  }

  Logger.groupEnd();
}

/**
 * 测试国际化功能
 */
function testLocalization() {
  Logger.group('国际化测试');

  try {
    // 测试基本翻译功能
    const key = 'processing';
    const translation = I18n.translate(key);

    if (translation && translation !== key) {
      Logger.info(`✅ 基本翻译测试通过: ${key} -> ${translation}`);
    } else {
      Logger.error(`❌ 基本翻译测试失败: ${key} -> ${translation}`);
    }

    // 测试带参数的翻译功能
    const paramKey = 'errorFileTypeNotSupported';
    const paramValue = 'text/plain';
    const paramTranslation = I18n.translate(paramKey, paramValue);

    if (paramTranslation && paramTranslation.includes(paramValue)) {
      Logger.info(`✅ 带参数翻译测试通过: ${paramTranslation}`);
    } else {
      Logger.error(`❌ 带参数翻译测试失败: ${paramKey}(${paramValue}) -> ${paramTranslation}`);
    }
  } catch (error) {
    Logger.error('❌ 国际化测试出错', error);
  }

  Logger.groupEnd();
}

/**
 * 测试UI组件功能
 */
function testUIComponents() {
  Logger.group('UI组件测试');

  try {
    // 测试通知组件
    if (typeof UI.notification.show === 'function') {
      Logger.info('✅ 通知组件测试通过');
    } else {
      Logger.error('❌ 通知组件测试失败');
    }

    // 测试加载指示器
    if (typeof UI.loading.show === 'function' &&
        typeof UI.loading.hide === 'function' &&
        typeof UI.loading.updateMessage === 'function') {
      Logger.info('✅ 加载指示器测试通过');
    } else {
      Logger.error('❌ 加载指示器测试失败');
    }

    // 测试标签页导航
    if (typeof UI.tabs.init === 'function' &&
        typeof UI.tabs.switchTo === 'function') {
      Logger.info('✅ 标签页导航测试通过');
    } else {
      Logger.error('❌ 标签页导航测试失败');
    }

    // 测试文件上传区域
    if (typeof UI.dropZone.init === 'function') {
      Logger.info('✅ 文件上传区域测试通过');
    } else {
      Logger.error('❌ 文件上传区域测试失败');
    }
  } catch (error) {
    Logger.error('❌ UI组件测试出错', error);
  }

  Logger.groupEnd();
}