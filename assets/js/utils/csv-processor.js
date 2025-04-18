/**
 * csv-processor.js - CSV处理模块
 * 提供CSV文件验证、处理和下载功能
 */

const CSVProcessor = {
  // 状态变量
  state: {
    currentWorker: null
  },

  /**
   * 验证CSV文件
   * @param {File} file 要验证的文件
   * @returns {Promise} 验证结果的Promise
   */
  validateFile: function(file) {
    return new Promise((resolve, reject) => {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
      const fileExt = file.name.split('.').pop().toLowerCase();

      if (!allowedTypes.includes(file.type) && fileExt !== 'csv') {
        reject(new Error(t('errorFileTypeNotSupported', file.type || fileExt)));
        return;
      }
      if (fileExt !== 'csv' && !allowedTypes.includes(file.type)) {
        reject(new Error(t('errorFileExtensionNotSupported', fileExt)));
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        reject(new Error(t('errorFileSizeExceeded', (file.size / (1024 * 1024)).toFixed(2))));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const sample = e.target.result.slice(0, 1000);

          if (!sample.includes('微信支付') && !sample.includes('账单') && !sample.includes('交易时间')) {
            reject(new Error(t('errorFileContentMismatch')));
            return;
          }

          resolve(file);
        } catch (error) {
          reject(new Error(t('errorFileContentValidationFailed', error.message)));
        }
      };

      reader.onerror = () => {
        reject(new Error(t('errorFileReadFailed')));
      };

      reader.readAsText(file.slice(0, 1000));
    });
  },

  /**
   * 读取文件内容
   * @param {File} file 要读取的文件
   * @returns {Promise<string>} 文件内容的Promise
   */
  readFile: function(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          Logger.debug('文件读取完成', {
            size: event.target.result.length
          });
          resolve(event.target.result);
        } catch (error) {
          Logger.error('文件读取失败', error);
          reject(new Error(t('errorFileReadFailed')));
        }
      };
      reader.onerror = () => {
        Logger.error('文件读取错误');
        reject(new Error(t('errorFileReadFailed')));
      };
      reader.readAsText(file);
    });
  },

  /**
   * 创建Web Worker处理CSV数据
   * @param {string} csvContent CSV内容
   * @param {Object} callbacks 回调函数对象 {onProgress, onResult, onError}
   */
  createWorker: function(csvContent, callbacks) {
    if (this.state.currentWorker) {
      this.state.currentWorker.terminate();
      this.state.currentWorker = null;
      Logger.debug('终止之前的Worker');
    }

    const workerCode = `
      function preprocessCSV(csvContent) {
          let lines = csvContent.split('\\n');

          const targetLineIndex = lines.findIndex(line =>
              line.includes('----------------------微信支付账单明细列表--------------------'));

          if (targetLineIndex !== -1) {
              lines = lines.slice(targetLineIndex + 2);
          }

          return lines;
      }

      function formatCSVField(field) {
          if (!field || field === "") return field;

          if (field.includes(',') || field.includes('"')) {
              return '"' + field.replace(/\"/g, '""') + '"';
          }
          return field;
      }

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
              } else if (char === '\\\\') {
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

      function processNoteText(text) {
          if (!text || text === "/") return text;

          if (text.startsWith('"') && text.endsWith('"')) {
              text = text.substring(1, text.length - 1);
          }

          return text
              .replace(/""/g, '"')
              .replace(/\\\\(.)/g, '\\\\$1')
              .replace(/,/g, '，');  // 将英文逗号替换为中文逗号
      }

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

      function processTransferInAccount(account) {
          if (!account) return "";

          if (account.includes("转账")) {
              const match = account.match(/转账到(.+)/);
              if (match && match[1]) {
                  return match[1].trim();
              }
          }

          return account;
      }

      function categorizeRecords(lines) {
          const transferRecords = [];
          const transactionRecords = [];
          let processedCount = 0;
          const totalLines = lines.length;

          lines.forEach((line, index) => {
              if (line.trim() === '') {
                  processedCount++;
                  if (index % Math.max(1, Math.floor(totalLines / 10)) === 0) {
                      self.postMessage({
                          type: 'progress',
                          data: {
                              stage: 'categorizing',
                              progress: Math.floor((processedCount / totalLines) * 100)
                          }
                      });
                  }
                  return;
              }

              const fields = parseCSVLine(line);

              if (fields.length > 4 && fields[4].includes('/')) {
                  if (fields.length > 6) {
                      const reformattedFields = [
                          fields[0],
                          fields.length > 6 ? fields[6] : "",
                          processTransferInAccount(fields.length > 1 ? fields[1] : ""),
                          fields.length > 5 ? fields[5].replace(/¥/g, "") : "",
                          "",
                          ""
                      ];

                      let lastNonEmptyIndex = reformattedFields.length - 1;
                      while (lastNonEmptyIndex >= 0 && reformattedFields[lastNonEmptyIndex] === "") {
                          lastNonEmptyIndex--;
                      }

                      const lastFieldToKeep = Math.max(7, lastNonEmptyIndex);

                      const reformattedLine = reformattedFields
                          .slice(0, lastFieldToKeep + 1)
                          .map(formatCSVField)
                          .join(',');

                      transferRecords.push(reformattedLine);
                  } else {
                      transferRecords.push("日期,转出账户,转入账户,金额,手续费,备注");
                  }
              } else {
                  // 提取备注文本
                  const noteText = extractNoteText(line, fields);

                  // 直接从字段中提取收支类型和金额
                  let incomeType = "";
                  let amount = "";

                  // 如果是转账类型，则收支类型在第五列
                  if (fields.length > 1 && fields[1] === "转账" && fields.length > 4) {
                      incomeType = fields[4]; // 第五列是收支类型（收入/支出）
                      amount = fields.length > 5 ? fields[5].replace(/¥/g, "") : ""; // 第六列是金额，去掉¥符号
                  } else {
                      // 其他类型的记录
                      incomeType = fields.length > 4 ? fields[4] : "";
                      amount = fields.length > 5 ? fields[5].replace(/¥/g, "") : "";
                  }

                  const reformattedFields = [
                      fields[0],
                      incomeType,
                      amount,
                      "",
                      "",
                      "账本",
                      fields.length > 6 ? fields[6] : "",
                      noteText,
                      ""
                  ];

                  // 移除尾部的空字段
                  let lastNonEmptyIndex = reformattedFields.length - 1;
                  while (lastNonEmptyIndex >= 0 && reformattedFields[lastNonEmptyIndex] === "") {
                      lastNonEmptyIndex--;
                  }

                  // 确保至少保留必要的字段
                  const lastFieldToKeep = Math.max(7, lastNonEmptyIndex);

                  // 用逗号连接字段，并在需要时保留引号
                  const reformattedLine = reformattedFields
                      .slice(0, lastFieldToKeep + 1)
                      .map(formatCSVField)
                      .join(',');

                  transactionRecords.push(reformattedLine);
              }

              processedCount++;
              if (index % Math.max(1, Math.floor(totalLines / 10)) === 0) {
                  self.postMessage({
                      type: 'progress',
                      data: {
                          stage: 'categorizing',
                          progress: Math.floor((processedCount / totalLines) * 100)
                      }
                  });
              }
          });

          return { transferRecords, transactionRecords };
      }

      self.addEventListener('message', function(e) {
          const { type, data } = e.data;

          if (type === 'process') {
              try {
                  self.postMessage({
                      type: 'progress',
                      data: {
                          stage: 'preprocessing',
                          progress: 0
                      }
                  });

                  const processedLines = preprocessCSV(data.csvContent);

                  self.postMessage({
                      type: 'progress',
                      data: {
                          stage: 'preprocessing',
                          progress: 100
                      }
                  });

                  if (processedLines.length === 0) {
                      self.postMessage({
                          type: 'error',
                          data: {
                              message: '处理后的CSV数据为空，请检查文件格式是否正确'
                          }
                      });
                      return;
                  }

                  self.postMessage({
                      type: 'progress',
                      data: {
                          stage: 'categorizing',
                          progress: 0
                      }
                  });

                  const { transferRecords, transactionRecords } = categorizeRecords(processedLines);

                  if (transferRecords.length === 0 && transactionRecords.length === 0) {
                      self.postMessage({
                          type: 'error',
                          data: {
                              message: '未找到有效的转账或交易记录，请检查文件格式'
                          }
                      });
                      return;
                  }

                  self.postMessage({
                      type: 'result',
                      data: {
                          transferRecords,
                          transactionRecords
                      }
                  });
              } catch (error) {
                  self.postMessage({
                      type: 'error',
                      data: {
                          message: \`处理CSV文件时出错: \${error.message}\`
                      }
                  });
              }
          }
      });
    `;

    let workerBlob, workerUrl;

    try {
      Logger.debug('创建 Web Worker');
      workerBlob = new Blob([workerCode], { type: 'application/javascript' });
      workerUrl = URL.createObjectURL(workerBlob);
      this.state.currentWorker = new Worker(workerUrl);
      Logger.info('Worker 创建成功');

      // 设置Worker消息处理
      this.state.currentWorker.onmessage = ({ data: { type, data } }) => {
        Logger.debug('Worker 消息', { type, data });

        if (type === 'progress' && callbacks.onProgress) {
          callbacks.onProgress(data);
        } else if (type === 'result' && callbacks.onResult) {
          callbacks.onResult(data);
        } else if (type === 'error' && callbacks.onError) {
          callbacks.onError(data);
        }
      };

      // 设置Worker错误处理
      this.state.currentWorker.onerror = (error) => {
        Logger.error('Worker 错误事件', error);
        if (callbacks.onError) {
          callbacks.onError({ message: error.message });
        }
        this.cleanupWorker(workerUrl);
        error.preventDefault();
      };

      // 发送数据到Worker
      UI.loading.updateMessage(t('sendingDataToWorker'));
      this.state.currentWorker.postMessage({ type: 'process', data: { csvContent } });

    } catch (error) {
      Logger.error('Worker 创建失败', error);
      if (callbacks.onError) {
        callbacks.onError({ message: error.message });
      }
      this.cleanupWorker(workerUrl);
      throw error;
    }
  },

  /**
   * 清理Worker资源
   * @param {string} workerUrl Worker URL
   */
  cleanupWorker: function(workerUrl) {
    if (this.state.currentWorker) {
      this.state.currentWorker.terminate();
      this.state.currentWorker = null;
      Logger.debug('Worker 已终止');
    }
    if (workerUrl) {
      URL.revokeObjectURL(workerUrl);
      Logger.debug('Worker URL 已释放');
    }
  },

  /**
   * 处理CSV文件
   * @param {File} file 要处理的文件
   * @returns {Promise} 处理结果的Promise
   */
  processFile: function(file) {
    return new Promise((resolve, reject) => {
      if (UI.state.isProcessing) {
        UI.notification.show(t('warningAlreadyProcessing'), 'info');
        reject(new Error(t('warningAlreadyProcessing')));
        return;
      }

      // 记录文件处理开始
      Logger.info('开始处理文件', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      Logger.timeStart('文件处理');

      // 清空文件输入框，允许重新选择同一文件
      document.getElementById('csv-file-input').value = '';

      UI.loading.show(t('loadingValidatingFile'));

      this.validateFile(file)
        .then(() => {
          Logger.debug('文件验证通过');
          UI.loading.updateMessage(t('loadingReadingFile'));
          return this.readFile(file);
        })
        .then(csvContent => {
          UI.loading.show(t('loadingProcessingFile'));

          // 创建Worker处理CSV数据
          this.createWorker(csvContent, {
            onProgress: (data) => {
              let message = t('processing');
              if (data.stage === 'preprocessing') {
                message = `正在预处理数据... ${data.progress}%`;
                Logger.debug(`预处理进度: ${data.progress}%`);
              } else if (data.stage === 'categorizing') {
                message = `正在分类记录... ${data.progress}%`;
                Logger.debug(`分类进度: ${data.progress}%`);
              }
              UI.loading.updateMessage(message);
            },
            onResult: (data) => {
              Logger.info('处理完成', {
                transferRecords: data.transferRecords.length,
                transactionRecords: data.transactionRecords.length
              });
              UI.loading.updateMessage(t('processingComplete'));
              this.createAndDownloadZip(data.transferRecords, data.transactionRecords, file.name)
                .then(() => {
                  UI.loading.hide();
                  Logger.timeEnd('文件处理');
                  Logger.info('文件处理完成');
                  resolve(data);
                })
                .catch(zipError => {
                  Logger.error('ZIP 创建失败', zipError);
                  UI.loading.hide();
                  UI.notification.show(t('errorZipCreationFailed', zipError.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")), 'error');
                  Logger.timeEnd('文件处理');
                  reject(zipError);
                })
                .finally(() => {
                  const workerUrl = this.state.currentWorker ? true : false;
                  this.cleanupWorker(workerUrl);
                });
            },
            onError: (data) => {
              Logger.error('Worker 错误', data.message);
              UI.loading.hide();
              UI.notification.show(t('errorProcessingFailed', data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")), 'error');
              const workerUrl = this.state.currentWorker ? true : false;
              this.cleanupWorker(workerUrl);
              Logger.timeEnd('文件处理');
              reject(new Error(data.message));
            }
          });
        })
        .catch(error => {
          Logger.error('处理CSV文件错误', error);
          UI.loading.hide();
          UI.notification.show(t('errorValidationFailed', error.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")), 'error');
          UI.state.isProcessing = false;
          Logger.timeEnd('文件处理');
          reject(error);
        });
    });
  },

  /**
   * 创建并下载ZIP文件
   * @param {Array} transferRecords 转账记录数组
   * @param {Array} transactionRecords 交易记录数组
   * @param {string} originalFileName 原始文件名
   * @returns {Promise} 下载结果的Promise
   */
  createAndDownloadZip: function(transferRecords, transactionRecords, originalFileName) {
    return new Promise((resolve, reject) => {
      try {
        UI.loading.updateMessage(t('creatingZip'));

        const zip = new JSZip();

        const sanitizedOriginalFileName = originalFileName.replace(/[<>:"/\|?*]/g, '_');
        const baseFileName = sanitizedOriginalFileName.replace(/\.[^/.]+$/, "");

        let dateStr = "";
        const dateMatch = baseFileName.match(/\d{8}-\d{8}/);
        if (dateMatch) {
          dateStr = `-${dateMatch[0]}`;
        }

        const filePrefix = t('filePrefix', dateStr);
        const currentDate = new Date();
        const localDate = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000));

        if (transferRecords.length > 0) {
          UI.loading.updateMessage(t('processingTransferRecords'));
          const headerRow = t('csvHeaderTransfer');

          let transferRecordsWithHeader;
          if (transferRecords.length === 1 || (!transferRecords[0].includes(t('csvDateHeaderPartial')))) {
            transferRecordsWithHeader = [headerRow, ...transferRecords];
          } else {
            transferRecordsWithHeader = [headerRow, ...transferRecords.slice(1)];
          }

          zip.file(`${filePrefix}${t('transferBillFileName')}.csv`, transferRecordsWithHeader.join('\n'), {
            date: localDate
          });
        }

        if (transactionRecords.length > 0) {
          UI.loading.updateMessage(t('processingTransactionRecords'));
          const headerRow = t('csvHeaderTransaction');

          let transactionRecordsWithHeader;
          if (transactionRecords.length === 1 || (!transactionRecords[0].includes(t('csvTransactionTimeHeaderPartial')) && !transactionRecords[0].includes(t('csvDateHeaderPartial')))) {
            transactionRecordsWithHeader = [headerRow, ...transactionRecords];
          } else {
            transactionRecordsWithHeader = [headerRow, ...transactionRecords.slice(1)];
          }

          zip.file(`${filePrefix}${t('transactionBillFileName')}.csv`, transactionRecordsWithHeader.join('\n'), {
            date: localDate
          });
        }

        UI.loading.updateMessage(t('generatingZip'));
        zip.generateAsync({
          type: 'blob',
          compression: "DEFLATE",
          compressionOptions: {
            level: 9
          }
        }).then((content) => {
          const downloadLink = document.createElement('a');
          downloadLink.href = URL.createObjectURL(content);
          downloadLink.download = `${filePrefix}${t('processedBillZipName')}.zip`;

          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);

          const summary = {
            transferCount: transferRecords.length > 0 ? transferRecords.length - 1 : 0,
            transactionCount: transactionRecords.length > 0 ? transactionRecords.length - 1 : 0,
            fileName: `${filePrefix}${t('processedBillZipName')}.zip`
          };

          UI.notification.show(t('processingSuccessNotification', summary.fileName, summary.transferCount, summary.transactionCount), 'success', 10000);

          resolve(summary);
        }).catch(error => {
          console.error('Error generating ZIP:', error);
          UI.notification.show(t('errorZipGenerationFailed', error.message), 'error');
          reject(error);
        }).finally(() => {
          UI.loading.hide();
        });
      } catch (error) {
        console.error('Error in createAndDownloadZip:', error);
        UI.notification.show(t('errorZipCreationFailedGeneral', error.message), 'error');
        UI.loading.hide();
        reject(error);
      }
    });
  }
};
