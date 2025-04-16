(function() {
    let isProcessing = false;
    let currentWorker = null;

    const showLoading = (message = t('processing')) => {
        if (document.getElementById('loading-overlay')) {
            updateLoadingMessage(message);
            return;
        }

        isProcessing = true;

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
    }

    const hideLoading = () => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.parentNode?.removeChild(overlay);
                isProcessing = false;
            }, 500);
        } else {
            isProcessing = false;
        }
        if (currentWorker) {
            currentWorker.terminate();
            currentWorker = null;
            console.log('Worker terminated.');
        }
    }

    const updateLoadingMessage = (message) => {
        const messageEl = document.getElementById('loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    const showNotification = (message, type = 'success', duration = 5000) => {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const sanitizedMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        notification.textContent = sanitizedMessage;

        container.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    notification.parentNode?.removeChild(notification);
                }, 300);
            }, duration);
        }

        return notification;
    }

    const createNotificationContainer = () => {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    const validateCSVFile = (file) => {
        return new Promise((resolve, reject) => {
            const allowedTypes = ['text/csv', 'application/vnd.ms-excel'];
            const fileExt = file.name.split('.').pop().toLowerCase();

            if (!allowedTypes.includes(file.type) && fileExt !== 'csv') {
                 reject(new Error(t('errorFileTypeNotSupported', file.type || fileExt)));
                 return;
            }
            if (fileExt !== 'csv' && !allowedTypes.includes(file.type) ) {
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
    }

    const createAndDownloadZip = (transferRecords, transactionRecords, originalFileName) => {
        return new Promise((resolve, reject) => {
            try {
                updateLoadingMessage(t('creatingZip'));

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
                    updateLoadingMessage(t('processingTransferRecords'));
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
                    updateLoadingMessage(t('processingTransactionRecords'));
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

                updateLoadingMessage(t('generatingZip'));
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

                    showNotification(t('processingSuccessNotification', summary.fileName, summary.transferCount, summary.transactionCount), 'success', 10000);

                    resolve();
                }).catch(error => {
                    console.error('Error generating ZIP:', error);
                    showNotification(t('errorZipGenerationFailed', error.message), 'error');
                    reject(error);
                }).finally(() => {
                    hideLoading();
                });
            } catch (error) {
                console.error('Error in createAndDownloadZip:', error);
                showNotification(t('errorZipCreationFailedGeneral', error.message), 'error');
                hideLoading();
                reject(error);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const uploadBtn = document.querySelector('.upload-btn');
        const fileInput = document.getElementById('csv-file-input');

        createNotificationContainer();

        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                this.classList.add('active');

                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        if (tabButtons.length > 0 && !document.querySelector('.tab-button.active')) {
            tabButtons[0].click();
        }

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                if (isProcessing) {
                    showNotification('正在处理文件，请稍候...', 'info');
                    return;
                }
                fileInput.click();
            });

            fileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    console.log('Uploaded file:', file.name);
                    processCSVFile(file);
                }
            });

            const dropZone = document.querySelector('.upload-area') || document.body;

            if (dropZone && dropZone !== document.body) {
                dropZone.addEventListener('click', () => {
                    if (isProcessing) {
                        showNotification('正在处理文件，请稍候...', 'info');
                        return;
                    }
                    fileInput.click();
                });
            }

            const preventDefaults = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            const highlight = () => {
                dropZone.classList.add('highlight');
            };

            const unhighlight = () => {
                dropZone.classList.remove('highlight');
            };

            const handleDrop = (e) => {
                if (isProcessing) {
                    showNotification('正在处理文件，请稍候...', 'info');
                    return;
                }

                const dt = e.dataTransfer;
                const file = dt.files[0];

                if (file) {
                    fileInput.files = dt.files;
                    processCSVFile(file);
                }
            };

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });

            dropZone.addEventListener('drop', handleDrop, false);
        }

        const processCSVFile = (file) => {
            if (isProcessing) {
                showNotification('正在处理文件，请稍候...', 'info');
                return;
            }

            fileInput.value = '';

            showLoading(t('loadingValidatingFile'));

            if (currentWorker) {
                currentWorker.terminate();
                currentWorker = null;
                console.log('Terminated previous worker.');
            }

            validateCSVFile(file)
                .then(() => {
                    updateLoadingMessage(t('loadingReadingFile'));
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                resolve(event.target.result);
                            } catch (error) {
                                reject(new Error(t('errorFileReadFailed')));
                            }
                        };
                        reader.onerror = () => {
                            reject(new Error(t('errorFileReadFailed')));
                        };
                        reader.readAsText(file);
                    });
                })
                .then(csvContent => {
                    showLoading(t('loadingProcessingFile'));

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
                                .replace(/"$/g, '');
                        }

                        function extractNoteText(line, fields) {
                            let noteText = "";

                            const originalLine = line.trim();
                            const commentStart = originalLine.indexOf('"转账备注:');

                            if (commentStart !== -1) {
                                const possibleEndMarkers = ['","收入"', '",'];
                                let commentEnd = -1;

                                for (const marker of possibleEndMarkers) {
                                    const endPos = originalLine.indexOf(marker, commentStart);
                                    if (endPos !== -1) {
                                        commentEnd = endPos;
                                        break;
                                    }
                                }

                                if (commentEnd !== -1) {
                                    const commentField = originalLine.substring(commentStart, commentEnd + 1);
                                    noteText = processNoteText(commentField);
                                }
                            } else {
                                if (fields.length > 1 && fields[1] === "转账" && fields.length > 3) {
                                    noteText = fields.length > 3 ? processNoteText(fields[3]) : "";
                                } else if (fields.length > 10) {
                                    noteText = processNoteText(fields[10]);
                                }
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
                                    const noteText = extractNoteText(line, fields);

                                    const reformattedFields = [
                                        fields[0],
                                        fields.length > 4 ? fields[4] : "",
                                        fields.length > 5 ? fields[5] : "",
                                        "",
                                        "",
                                        "账本",
                                        fields.length > 6 ? fields[6] : "",
                                        noteText,
                                        ""
                                    ];

                                    const reformattedLine = reformattedFields
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
                        workerBlob = new Blob([workerCode], { type: 'application/javascript' });
                        workerUrl = URL.createObjectURL(workerBlob);
                        currentWorker = new Worker(workerUrl);
                        console.log('Worker created:', workerUrl);
                    } catch (error) {
                        console.error('Error creating worker:', error);
                        hideLoading();
                        showNotification(t('errorWorkerGeneral', error.message), 'error');
                        if (workerUrl) URL.revokeObjectURL(workerUrl);
                        return;
                    }

                    currentWorker.onmessage = ({ data: { type, data } }) => {
                        console.log('Message from worker:', type, data);

                        if (type === 'progress') {
                            let message = t('processing');
                            if (data.stage === 'preprocessing') {
                                message = `正在预处理数据... ${data.progress}%`;
                            } else if (data.stage === 'categorizing') {
                                message = `正在分类记录... ${data.progress}%`;
                            }
                            updateLoadingMessage(message);
                        } else if (type === 'result') {
                            updateLoadingMessage(t('processingComplete'));
                            createAndDownloadZip(data.transferRecords, data.transactionRecords, file.name)
                                .then(() => {
                                    hideLoading();
                                })
                                .catch(zipError => {
                                    console.error('Error creating ZIP file:', zipError);
                                    hideLoading();
                                    showNotification(t('errorZipCreationFailed', zipError.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")), 'error');
                                })
                                .finally(() => {
                                    if (currentWorker) {
                                        currentWorker.terminate();
                                        currentWorker = null;
                                    }
                                    URL.revokeObjectURL(workerUrl);
                                    console.log('Worker terminated and URL revoked after success.');
                                });
                        } else if (type === 'error') {
                            console.error('Error from worker:', data.message);
                            hideLoading();
                            showNotification(t('errorProcessingFailed', data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")), 'error');
                            if (currentWorker) {
                                currentWorker.terminate();
                                currentWorker = null;
                            }
                            URL.revokeObjectURL(workerUrl);
                            console.log('Worker terminated and URL revoked after worker error.');
                        }
                    };

                    currentWorker.onerror = (error) => {
                        console.error('Worker error event:', error);
                        hideLoading();
                        showNotification(t('errorWorkerGeneral', error.message), 'error');
                        if (currentWorker) {
                            currentWorker.terminate();
                            currentWorker = null;
                        }
                        URL.revokeObjectURL(workerUrl);
                        console.log('Worker terminated and URL revoked after onerror.');
                        error.preventDefault();
                    };

                    updateLoadingMessage(t('sendingDataToWorker'));
                    currentWorker.postMessage({ type: 'process', data: { csvContent } });

                })
                .catch(error => {
                    console.error('Error processing CSV file:', error);
                    hideLoading();
                    showNotification(t('errorValidationFailed', error.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")), 'error');
                    isProcessing = false;
                });
        }
    });

})();
