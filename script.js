// Wrap the entire script in an IIFE to avoid global scope pollution
(function() {
    // Global variables for UI state management
    let isProcessing = false;
    let currentWorker = null; // Keep track of the current worker

    // Helper functions moved outside DOMContentLoaded but within the IIFE

    // Function to show loading state
    function showLoading(message = '处理中...') {
        // Check if loading overlay already exists
        if (document.getElementById('loading-overlay')) {
            // Update message if already showing
            updateLoadingMessage(message);
            return;
        }

        isProcessing = true;

        // Create loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';

        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = 'spinner';

        // Create message element
        const messageEl = document.createElement('p');
        messageEl.id = 'loading-message';
        messageEl.textContent = message;

        // Append elements
        overlay.appendChild(spinner);
        overlay.appendChild(messageEl);
        document.body.appendChild(overlay);
    }

    // Function to hide loading state
    function hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                isProcessing = false; // Reset processing state here
            }, 500); // Match this with CSS transition time
        } else {
            isProcessing = false; // Ensure state is reset even if overlay wasn't found
        }
        // Terminate worker if it exists
        if (currentWorker) {
            currentWorker.terminate();
            currentWorker = null;
            console.log('Worker terminated.');
        }
    }

    // Function to update loading message
    function updateLoadingMessage(message) {
        const messageEl = document.getElementById('loading-message');
        if (messageEl) {
            messageEl.textContent = message;
        }
    }

    // Function to show notification
    function showNotification(message, type = 'success', duration = 5000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // Create message content
        const content = document.createElement('div');
        content.className = 'notification-content';

        // Add appropriate icon based on type
        const icon = document.createElement('i');
        if (type === 'success') {
            icon.className = 'fas fa-check-circle';
        } else if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
        } else if (type === 'warning') {
            icon.className = 'fas fa-exclamation-triangle';
        } else if (type === 'info') {
            icon.className = 'fas fa-info-circle';
        }

        // Create text element
        const text = document.createElement('span');
        text.textContent = message;

        // Create close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        });

        // Assemble notification
        content.appendChild(icon);
        content.appendChild(text);
        notification.appendChild(content);
        notification.appendChild(closeBtn);

        // Add to document
        const container = document.querySelector('.notification-container') || createNotificationContainer();
        container.appendChild(notification);

        // Show with animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.classList.add('fade-out');
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.parentNode.removeChild(notification);
                        }
                    }, 300);
                }
            }, duration);
        }

        return notification;
    }

    // Helper function to create notification container
    function createNotificationContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    // Function to validate CSV file
    function validateCSVFile(file) {
        return new Promise((resolve, reject) => {
            // Check if file exists
            if (!file) {
                reject(new Error('未选择文件'));
                return;
            }

            // Check file extension
            const fileExt = file.name.split('.').pop().toLowerCase();
            if (fileExt !== 'csv') {
                reject(new Error(`文件类型不支持: ${fileExt}。请上传CSV文件`));
                return;
            }

            // Check file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxSize) {
                reject(new Error(`文件过大: ${(file.size / (1024 * 1024)).toFixed(2)}MB。最大支持10MB`));
                return;
            }

            // Basic content validation by reading first few bytes
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const sample = e.target.result.slice(0, 1000); // Read first 1000 chars

                    // Check if it's likely a WeChat payment record
                    if (!sample.includes('微信支付') && !sample.includes('账单') && !sample.includes('交易时间')) {
                        reject(new Error('文件内容不符合微信支付账单格式'));
                        return;
                    }

                    resolve(file);
                } catch (error) {
                    reject(new Error(`文件内容验证失败: ${error.message}`));
                }
            };

            reader.onerror = function() {
                reject(new Error('读取文件失败'));
            };

            // Read as text to check content
            reader.readAsText(file.slice(0, 1000));
        });
    }

    // Function to create and download a ZIP file
    function createAndDownloadZip(transferRecords, transactionRecords, originalFileName) {
        return new Promise((resolve, reject) => {
            try {
                updateLoadingMessage('正在创建ZIP文件...');

                // JSZip库已在HTML中引入，直接使用
                // Create a new ZIP file
                const zip = new JSZip();

                // Get the file name without extension
                const baseFileName = originalFileName.replace(/\.[^/.]+$/, "");

                // Extract date range if it exists in the format (yyyymmdd-yyyymmdd)
                let dateStr = "";
                const dateMatch = baseFileName.match(/\d{8}-\d{8}/);
                if (dateMatch) {
                    dateStr = `-${dateMatch[0]}`;
                }

                // Create file name prefix with required elements
                const filePrefix = `一木记账工坊-微信${dateStr}-`;

                // Create a date with offset to fix timezone issue
                const currentDate = new Date();
                const localDate = new Date(currentDate.getTime() - (currentDate.getTimezoneOffset() * 60000));

                // Add transfer records to the ZIP
                if (transferRecords.length > 0) {
                    updateLoadingMessage('正在处理转账记录...');
                    // Create header row for transfer records with the proper column names
                    const headerRow = "日期,转出账户,转入账户,金额,手续费,备注";

                    // If there's only one transfer record or the first record doesn't look like a header,
                    // just add our custom header. Otherwise, replace the first record (original header)
                    let transferRecordsWithHeader;
                    if (transferRecords.length === 1 || (!transferRecords[0].includes('日期'))) {
                        transferRecordsWithHeader = [headerRow, ...transferRecords];
                    } else {
                        transferRecordsWithHeader = [headerRow, ...transferRecords.slice(1)];
                    }

                    zip.file(`${filePrefix}转账账单.csv`, transferRecordsWithHeader.join('\n'), {
                        date: localDate
                    });
                }

                // Add transaction records to the ZIP
                if (transactionRecords.length > 0) {
                    updateLoadingMessage('正在处理收支记录...');
                    // Create header row for transaction records with the proper column names
                    const headerRow = "日期,收支类型,金额,类别,子类,所属账本,收支账户,备注,标签";

                    // If there's only one transaction record or the first record doesn't look like a header,
                    // just add our custom header. Otherwise, replace the first record (original header)
                    let transactionRecordsWithHeader;
                    if (transactionRecords.length === 1 || (!transactionRecords[0].includes('交易时间') && !transactionRecords[0].includes('日期'))) {
                        transactionRecordsWithHeader = [headerRow, ...transactionRecords];
                    } else {
                        transactionRecordsWithHeader = [headerRow, ...transactionRecords.slice(1)];
                    }

                    zip.file(`${filePrefix}收支账单.csv`, transactionRecordsWithHeader.join('\n'), {
                        date: localDate
                    });
                }

                updateLoadingMessage('正在生成ZIP文件...');
                // Generate the ZIP file
                zip.generateAsync({
                    type: 'blob',
                    compression: "DEFLATE",
                    compressionOptions: {
                        level: 9
                    }
                }).then(function(content) {
                    // Create a download link
                    const downloadLink = document.createElement('a');
                    downloadLink.href = URL.createObjectURL(content);
                    downloadLink.download = `${filePrefix}处理后的账单.zip`;

                    // Trigger the download
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);

                    // Create summary for notification
                    const summary = {
                        transferCount: transferRecords.length > 0 ? transferRecords.length - 1 : 0,
                        transactionCount: transactionRecords.length > 0 ? transactionRecords.length - 1 : 0,
                        fileName: `${filePrefix}处理后的账单.zip`
                    };

                    resolve(summary);
                }).catch(function(error) {
                    console.error('Error creating ZIP:', error);
                    reject(new Error(`创建ZIP文件失败: ${error.message}`));
                });
            } catch (error) {
                console.error('Error in ZIP creation process:', error);
                reject(new Error(`ZIP文件处理过程中出错: ${error.message}`));
            }
        });
    }

    // Main execution logic after DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.querySelector('.sidebar');
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        const uploadBtn = document.querySelector('.upload-btn');
        const fileInput = document.getElementById('csv-file-input');

        // Create notification container on page load
        createNotificationContainer();

        // Setup tab click behavior
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to clicked button
                this.classList.add('active');

                // Show corresponding content
                const tabId = this.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Initialize the first tab as active if no tab is active
        if (tabButtons.length > 0 && !document.querySelector('.tab-button.active')) {
            tabButtons[0].click();
        }

        // Upload CSV file button functionality
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', function() {
                // Prevent multiple uploads while processing
                if (isProcessing) {
                    showNotification('正在处理文件，请稍候...', 'info');
                    return;
                }
                fileInput.click();
            });

            fileInput.addEventListener('change', function(event) {
                const file = event.target.files[0];
                if (file) {
                    // Handle the CSV file upload
                    console.log('Uploaded file:', file.name);
                    processCSVFile(file); // Call the processing function
                }
            });

            // Add drag and drop support
            const dropZone = document.querySelector('.upload-area') || document.body;

            // Make the upload area clickable
            if (dropZone && dropZone !== document.body) {
                dropZone.addEventListener('click', function() {
                    // Prevent multiple uploads while processing
                    if (isProcessing) {
                        showNotification('正在处理文件，请稍候...', 'info');
                        return;
                    }
                    fileInput.click();
                });
            }

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, preventDefaults, false);
            });

            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }

            ['dragenter', 'dragover'].forEach(eventName => {
                dropZone.addEventListener(eventName, highlight, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, unhighlight, false);
            });

            function highlight() {
                dropZone.classList.add('highlight');
            }

            function unhighlight() {
                dropZone.classList.remove('highlight');
            }

            dropZone.addEventListener('drop', handleDrop, false);

            function handleDrop(e) {
                if (isProcessing) {
                    showNotification('正在处理文件，请稍候...', 'info');
                    return;
                }

                const dt = e.dataTransfer;
                const file = dt.files[0];

                if (file) {
                    // Update file input for consistency
                    fileInput.files = dt.files;
                    processCSVFile(file);
                }
            }
        }

        // Function to process the uploaded CSV file (kept separate for clarity)
        function processCSVFile(file) {
            // Prevent processing if already in progress
            if (isProcessing) {
                showNotification('正在处理文件，请稍候...', 'info');
                return;
            }

            // Reset file input immediately to allow re-upload of the same file if needed
            fileInput.value = '';

            // Show loading indicator
            showLoading('正在验证文件...');

            // Terminate any previous worker instance before starting new validation/processing
            if (currentWorker) {
                currentWorker.terminate();
                currentWorker = null;
                console.log('Terminated previous worker.');
            }

            // First validate the file
            validateCSVFile(file)
                .then(() => {
                    updateLoadingMessage('正在读取文件...');
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            try {
                                resolve(event.target.result);
                            } catch (error) {
                                reject(new Error(`读取文件内容失败: ${error.message}`));
                            }
                        };
                        reader.onerror = function() {
                            reject(new Error('读取文件失败'));
                        };
                        reader.readAsText(file);
                    });
                })
                .then(csvContent => {
                    showLoading('正在启动处理线程...'); // Update message for worker start

                    // --- INLINE WORKER CODE ---
                    const workerCode = `
                        // csv-worker.js - Web Worker for CSV processing (Embedded)
                        // 该文件包含所有CSV处理相关的函数，在后台线程中执行

                        // 预处理CSV内容
                        function preprocessCSV(csvContent) {
                            // 分割内容为行
                            let lines = csvContent.split('\\n');

                            // 查找包含"微信支付账单明细列表"的行的索引
                            const targetLineIndex = lines.findIndex(line =>
                                line.includes('----------------------微信支付账单明细列表--------------------'));

                            // 如果找到，移除该行及之前的所有行和下一行
                            if (targetLineIndex !== -1) {
                                lines = lines.slice(targetLineIndex + 2);
                            }

                            // 返回处理后的行
                            return lines;
                        }

                        // 通用的CSV字段格式化函数 - 处理引号和逗号
                        function formatCSVField(field) {
                            if (!field || field === "") return field;

                            // 如果字段包含逗号或引号，需要用引号包裹并转义内部引号
                            if (field.includes(',') || field.includes('"')) {
                                return '"' + field.replace(/\"/g, '""') + '"';
                            }
                            return field;
                        }

                        // 改进的CSV行解析函数，更好地处理带有逗号和引号的备注
                        function parseCSVLine(line) {
                            const fields = [];
                            let currentField = '';
                            let inQuotes = false;
                            let i = 0;

                            while (i < line.length) {
                                const char = line[i];

                                if (char === '"') {
                                    if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                                        // 处理CSV规范的双引号转义 ("" -> ")
                                        currentField += '"';
                                        i += 2; // 跳过两个引号
                                    } else {
                                        // 普通引号，切换引号标志
                                        inQuotes = !inQuotes;
                                        i++;
                                    }
                                } else if (char === '\\\\') { // Note: Backslash needs double escaping in template literal
                                    // 处理转义字符
                                    currentField += char;
                                    i++;
                                    // 保留转义后的字符
                                    if (i < line.length) {
                                        currentField += line[i];
                                        i++;
                                    }
                                } else if (char === ',' && !inQuotes) {
                                    // 字段结束，只有在不在引号内时才分割字段
                                    fields.push(currentField);
                                    currentField = '';
                                    i++;
                                } else {
                                    // 添加字符到当前字段
                                    currentField += char;
                                    i++;
                                }
                            }

                            // 添加最后一个字段
                            fields.push(currentField);
                            return fields;
                        }

                        // 处理备注文本的函数 - 简化版
                        function processNoteText(text) {
                            // 特殊情况处理
                            if (!text || text === "/") return text;

                            // 去掉两端的引号
                            if (text.startsWith('"') && text.endsWith('"')) {
                                text = text.substring(1, text.length - 1);
                            }

                            // 使用正则表达式简化处理
                            // 1. 处理连续引号 "" -> "
                            // 2. 保留反斜杠转义
                            // 3. 保留逗号
                            return text
                                .replace(/""/g, '"')  // 处理连续引号
                                .replace(/\\\\(.)/g, '\\\\$1') // Note: Backslash needs double escaping
                                .replace(/"$/g, '');  // 移除末尾引号
                        }

                        // 提取备注文本的辅助函数
                        function extractNoteText(line, fields) {
                            let noteText = "";

                            // 先检查原始行中是否包含备注字段
                            const originalLine = line.trim();
                            const commentStart = originalLine.indexOf('"转账备注:');

                            if (commentStart !== -1) {
                                // 如果原始行中包含备注字段，直接提取备注字段
                                // 找到备注字段的结束位置
                                const possibleEndMarkers = ['","收入"', '",'];
                                let commentEnd = -1;

                                // 尝试所有可能的结束标记
                                for (const marker of possibleEndMarkers) {
                                    const endPos = originalLine.indexOf(marker, commentStart);
                                    if (endPos !== -1) {
                                        commentEnd = endPos;
                                        break;
                                    }
                                }

                                if (commentEnd !== -1) {
                                    // 提取备注字段
                                    const commentField = originalLine.substring(commentStart, commentEnd + 1);
                                    noteText = processNoteText(commentField);
                                }
                            } else {
                                // 如果原始行中不包含备注字段，使用字段数组中的字段
                                // 根据规则判断备注所在位置
                                if (fields.length > 1 && fields[1] === "转账" && fields.length > 3) {
                                    // 如果原本第二列是"转账"，则备注在原本的第四列
                                    noteText = fields.length > 3 ? processNoteText(fields[3]) : "";
                                } else if (fields.length > 10) {
                                    // 否则备注在原本的第11列
                                    noteText = processNoteText(fields[10]);
                                }
                            }

                            return noteText;
                        }

                        // 处理转入账户的函数
                        function processTransferInAccount(account) {
                            if (!account) return "";

                            // 如果账户名称包含"转账"，提取实际账户名称
                            if (account.includes("转账")) {
                                const match = account.match(/转账到(.+)/);
                                if (match && match[1]) {
                                    return match[1].trim();
                                }
                            }

                            return account;
                        }

                        // 将记录分类为转账记录和交易记录
                        function categorizeRecords(lines) {
                            const transferRecords = [];
                            const transactionRecords = [];
                            let processedCount = 0;
                            const totalLines = lines.length;

                            lines.forEach((line, index) => {
                                if (line.trim() === '') {
                                    // 跳过空行
                                    processedCount++;
                                    // 每处理10%的数据，发送一次进度更新
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

                                // 使用正确的CSV行解析函数分割行
                                const fields = parseCSVLine(line);

                                // 检查第5个字段（索引4）是否包含"/"字符，用于识别转账记录
                                if (fields.length > 4 && fields[4].includes('/')) {
                                    // 处理转账记录
                                    if (fields.length > 6) {
                                        // 根据指定要求创建具有6列的新数组
                                        const reformattedFields = [
                                            fields[0],                // 第1列 ← 原始第1列（日期）
                                            fields.length > 6 ? fields[6] : "", // 第2列 ← 原始第7列（转出账户）
                                            // 第3列 ← 处理原始第2列（转入账户）
                                            processTransferInAccount(fields.length > 1 ? fields[1] : ""),
                                            // 第4列 ← 原始第6列（金额），移除¥符号
                                            fields.length > 5 ? fields[5].replace(/¥/g, "") : "",
                                            "",                       // 第5列 - 空（手续费）
                                            ""                        // 第6列 - 空（备注）
                                        ];

                                        // 移除尾部的空字段
                                        let lastNonEmptyIndex = reformattedFields.length - 1;
                                        while (lastNonEmptyIndex >= 0 && reformattedFields[lastNonEmptyIndex] === "") {
                                            lastNonEmptyIndex--;
                                        }

                                        // 确保至少保留8个字段（索引7）以保留备注和标签之间的逗号
                                        const lastFieldToKeep = Math.max(7, lastNonEmptyIndex);

                                        // 用逗号连接字段，并在需要时保留引号
                                        const reformattedLine = reformattedFields
                                            .slice(0, lastFieldToKeep + 1)
                                            .map(formatCSVField)
                                            .join(',');

                                        transferRecords.push(reformattedLine);
                                    } else {
                                        // 如果原始行可能是标题或不完整，添加正确格式的标题
                                        transferRecords.push("日期,转出账户,转入账户,金额,手续费,备注");
                                    }
                                } else {
                                    // 处理交易记录
                                    // 提取备注文本
                                    const noteText = extractNoteText(line, fields);

                                    // 根据指定要求创建具有9列的新数组
                                    const reformattedFields = [
                                        fields[0],                // 第1列 ← 原始第1列
                                        fields.length > 4 ? fields[4] : "", // 第2列 ← 原始第5列
                                        fields.length > 5 ? fields[5] : "", // 第3列 ← 原始第6列
                                        "",                       // 第4列 - 空
                                        "",                       // 第5列 - 空
                                        "账本",                   // 第6列 - 固定值"账本"
                                        fields.length > 6 ? fields[6] : "", // 第7列 ← 原始第7列
                                        // 第8列 ← 处理备注文本并放在这里
                                        noteText,
                                        ""                        // 第9列 - 空
                                    ];

                                    // 用逗号连接字段，并在需要时保留引号
                                    const reformattedLine = reformattedFields
                                        .map(formatCSVField)
                                        .join(',');

                                    transactionRecords.push(reformattedLine);
                                }

                                processedCount++;
                                // 每处理10%的数据，发送一次进度更新
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

                        // 监听来自主线程的消息
                        self.addEventListener('message', function(e) {
                            const { type, data } = e.data;

                            if (type === 'process') {
                                try {
                                    // 发送开始处理的消息
                                    self.postMessage({
                                        type: 'progress',
                                        data: {
                                            stage: 'preprocessing',
                                            progress: 0
                                        }
                                    });

                                    // 预处理CSV内容
                                    const processedLines = preprocessCSV(data.csvContent);

                                    // 发送预处理完成的消息
                                    self.postMessage({
                                        type: 'progress',
                                        data: {
                                            stage: 'preprocessing',
                                            progress: 100
                                        }
                                    });

                                    // 检查处理后的数据是否为空
                                    if (processedLines.length === 0) {
                                        self.postMessage({
                                            type: 'error',
                                            data: {
                                                message: '处理后的CSV数据为空，请检查文件格式是否正确'
                                            }
                                        });
                                        return;
                                    }

                                    // 发送开始分类的消息
                                    self.postMessage({
                                        type: 'progress',
                                        data: {
                                            stage: 'categorizing',
                                            progress: 0
                                        }
                                    });


                                    // 分类记录
                                    const { transferRecords, transactionRecords } = categorizeRecords(processedLines);

                                    // 检查分类后的记录是否为空
                                    if (transferRecords.length === 0 && transactionRecords.length === 0) {
                                        self.postMessage({
                                            type: 'error',
                                            data: {
                                                message: '未找到有效的转账或交易记录，请检查文件格式'
                                            }
                                        });
                                        return;
                                    }

                                    // 发送处理结果
                                    self.postMessage({
                                        type: 'result',
                                        data: {
                                            transferRecords,
                                            transactionRecords
                                        }
                                    });
                                } catch (error) {
                                    // 发送错误消息
                                    self.postMessage({
                                        type: 'error',
                                        data: {
                                            message: \`处理CSV文件时出错: \${error.message}\` // Use backticks for template literal in worker
                                        }
                                    });
                                }
                            }
                        });
                    `; // End of worker code string

                    let workerBlob, workerUrl;

                    try {
                        workerBlob = new Blob([workerCode], { type: 'application/javascript' });
                        workerUrl = URL.createObjectURL(workerBlob);
                        currentWorker = new Worker(workerUrl); // Assign to global tracker
                        console.log('Worker created:', workerUrl);
                    } catch (error) {
                        console.error('Error creating worker:', error);
                        hideLoading();
                        showNotification(`创建处理线程失败: ${error.message}`, 'error');
                        if (workerUrl) URL.revokeObjectURL(workerUrl); // Clean up URL if created
                        return; // Stop processing
                    }


                    // Handle messages from worker
                    currentWorker.onmessage = function(e) {
                        const { type, data } = e.data;
                        console.log('Message from worker:', type, data);

                        if (type === 'progress') {
                            // Update loading message based on progress
                            let message = '处理中...';
                            if (data.stage === 'preprocessing') {
                                message = `正在预处理数据... ${data.progress}%`;
                            } else if (data.stage === 'categorizing') {
                                message = `正在分类记录... ${data.progress}%`;
                            }
                            updateLoadingMessage(message);
                        } else if (type === 'result') {
                            // Process results and create ZIP
                            updateLoadingMessage('处理完成，正在准备下载...');
                            createAndDownloadZip(data.transferRecords, data.transactionRecords, file.name)
                                .then(summary => {
                                    hideLoading(); // Hide loading AFTER zip creation
                                    // Show success notification with summary
                                    const message = `处理完成！共处理 ${summary.transferCount} 条转账记录和 ${summary.transactionCount} 条交易记录。`;
                                    showNotification(message, 'success');
                                })
                                .catch(zipError => {
                                    console.error('Error creating ZIP file:', zipError);
                                    hideLoading();
                                    showNotification(`创建ZIP文件失败: ${zipError.message}`, 'error');
                                })
                                .finally(() => {
                                    // Clean up worker and URL after processing result
                                    if (currentWorker) {
                                        currentWorker.terminate();
                                        currentWorker = null;
                                    }
                                    URL.revokeObjectURL(workerUrl);
                                    console.log('Worker terminated and URL revoked after success.');
                                });
                        } else if (type === 'error') {
                            // Handle errors reported by the worker
                            console.error('Error from worker:', data.message);
                            hideLoading();
                            showNotification(`处理失败: ${data.message}`, 'error');
                            // Clean up worker and URL after error
                            if (currentWorker) {
                                currentWorker.terminate();
                                currentWorker = null;
                            }
                            URL.revokeObjectURL(workerUrl);
                            console.log('Worker terminated and URL revoked after worker error.');
                        }
                    };

                    // Handle general worker errors
                    currentWorker.onerror = function(error) {
                        console.error('Worker error event:', error);
                        hideLoading();
                        showNotification(`处理线程发生错误: ${error.message}`, 'error');
                         // Clean up worker and URL on error
                        if (currentWorker) {
                            currentWorker.terminate();
                            currentWorker = null;
                        }
                        URL.revokeObjectURL(workerUrl);
                        console.log('Worker terminated and URL revoked after onerror.');
                        error.preventDefault(); // Prevent default error handling
                    };

                    // Send CSV content to worker to start processing
                    updateLoadingMessage('正在发送数据到处理线程...');
                    currentWorker.postMessage({ type: 'process', data: { csvContent } });

                })
                .catch(error => {
                    // Error handling for validation or file reading
                    console.error('Error processing CSV file:', error);
                    hideLoading(); // Ensure loading is hidden on error
                    showNotification(`处理失败: ${error.message}`, 'error');
                    // No worker to terminate here yet, but ensure isProcessing is false
                    isProcessing = false;
                });
        }
    }); // End of DOMContentLoaded listener

})(); // End of IIFE
