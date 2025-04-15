// Wrap the entire script in an IIFE to avoid global scope pollution
(function() {
    // Global variables for UI state management
    let isProcessing = false;

    // Helper functions moved outside DOMContentLoaded but within the IIFE

    // Function to preprocess the CSV content
    function preprocessCSV(csvContent) {
        // Split content into lines
        let lines = csvContent.split('\n');

        // Find the index of the line with "微信支付账单明细列表"
        const targetLineIndex = lines.findIndex(line =>
            line.includes('----------------------微信支付账单明细列表--------------------'));

        // If found, remove all lines up to and including the target line and the next line
        if (targetLineIndex !== -1) {
            lines = lines.slice(targetLineIndex + 2);
        }

        // Return the processed lines
        return lines;
    }

    // 通用的CSV字段格式化函数 - 处理引号和逗号
    function formatCSVField(field) {
        if (!field || field === "") return field;

        // 如果字段包含逗号或引号，需要用引号包裹并转义内部引号
        if (field.includes(',') || field.includes('"')) {
            return '"' + field.replace(/"/g, '""') + '"';
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
            } else if (char === '\\') {
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
            .replace(/\\(.)/g, '\\$1')  // 保留转义字符
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

    // Function to categorize records into transfer and transaction records
    function categorizeRecords(lines) {
        const transferRecords = [];
        const transactionRecords = [];

        lines.forEach(line => {
            if (line.trim() === '') return; // Skip empty lines

            // Split the line by comma, handling quoted fields correctly
            const fields = parseCSVLine(line);

            // Check if the 5th field (index 4) contains a "/" character
            if (fields.length > 4 && fields[4].includes('/')) {
                // Process transfer records according to requirements
                if (fields.length > 6) {
                    // Create new array with 6 columns according to the specified requirements
                    const reformattedFields = [
                        fields[0],                // Column 1 ← Original Column 1 (Date)
                        fields.length > 6 ? fields[6] : "", // Column 2 ← Original Column 7 (Transfer out account)
                        // Column 3 ← Process original Column 2 (Transfer in account)
                        processTransferInAccount(fields.length > 1 ? fields[1] : ""),
                        // Column 4 ← Original Column 6 (Amount) with ¥ symbol removed
                        fields.length > 5 ? fields[5].replace(/¥/g, "") : "",
                        "",                       // Column 5 - Empty (Fee)
                        ""                        // Column 6 - Empty (Notes)
                    ];

                    // Remove trailing empty fields
                    let lastNonEmptyIndex = reformattedFields.length - 1;
                    while (lastNonEmptyIndex >= 0 && reformattedFields[lastNonEmptyIndex] === "") {
                        lastNonEmptyIndex--;
                    }

                    // Ensure we keep at least 8 fields (index 7) to preserve the comma between remarks and tags
                    const lastFieldToKeep = Math.max(7, lastNonEmptyIndex);

                    // Join fields with commas and preserve quotes if needed
                    const reformattedLine = reformattedFields
                        .slice(0, lastFieldToKeep + 1)
                        .map(formatCSVField)
                        .join(',');

                    transferRecords.push(reformattedLine);
                } else {
                    // If the original line is likely a header or incomplete, add a properly formatted header
                    transferRecords.push("日期,转出账户,转入账户,金额,手续费,备注");
                }
            // This is a transaction record - reformat it according to requirements
            } else if (fields.length > 0) {
                // 获取备注内容并进行处理
                const noteText = extractNoteText(line, fields);

                // Create new array with 9 columns according to the specified requirements
                const reformattedFields = [
                  fields[0],                // Column 1 ← Original Column 1
                  fields.length > 4 ? fields[4] : "", // Column 2 ← Original Column 5
                  fields.length > 5 ? fields[5] : "", // Column 3 ← Original Column 6
                  "",                       // Column 4 - Empty
                  "",                       // Column 5 - Empty
                  "账本",                   // Column 6 - Fixed value "账本"
                  fields.length > 6 ? fields[6] : "", // Column 7 ← Original Column 7
                  // Column 8 ← Process note text and place it here
                  noteText,
                  ""                        // Column 9 - Empty
                ];

                // Join fields with commas and preserve quotes if needed
                const reformattedLine = reformattedFields
                    .map(formatCSVField)
                    .join(',');

                transactionRecords.push(reformattedLine);
            }
        });

        return { transferRecords, transactionRecords };
    }

    // Function to process transfer in account according to requirements
    function processTransferInAccount(field) {
        if (field.includes("到")) {
            // Extract characters after "到"
            const afterTo = field.substring(field.indexOf("到") + 1);

            // Check if it contains "银行"
            if (afterTo.includes("银行")) {
                // Add "储蓄卡" after "银行"
                const bankIndex = afterTo.indexOf("银行");
                return afterTo.substring(0, bankIndex + 2) + "储蓄卡" + afterTo.substring(bankIndex + 2);
            }

            return afterTo;
        } else if (field.includes("转入") && field.includes("-")) {
            // Extract characters between "转入" and "-"
            const startIndex = field.indexOf("转入") + 2;
            const endIndex = field.indexOf("-", startIndex);

            if (endIndex > startIndex) {
                return field.substring(startIndex, endIndex);
            }
        }

        // Return original value if no processing rules match
        return field;
    }

    // Function to show loading state
    function showLoading(message = '处理中...') {
        // Check if loading overlay already exists
        if (document.getElementById('loading-overlay')) {
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
                isProcessing = false;
            }, 500); // Match this with CSS transition time
        } else {
            isProcessing = false;
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

            // Show loading indicator
            showLoading('正在验证文件...');

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
                    updateLoadingMessage('正在预处理CSV数据...');
                    // Process the CSV content using the helper function
                    const processedData = preprocessCSV(csvContent);

                    if (processedData.length === 0) {
                        throw new Error('处理后的CSV数据为空，请检查文件格式是否正确');
                    }

                    return processedData;
                })
                .then(processedData => {
                    updateLoadingMessage('正在分类记录...');
                    // Categorize the records using the helper function
                    const { transferRecords, transactionRecords } = categorizeRecords(processedData);

                    if (transferRecords.length === 0 && transactionRecords.length === 0) {
                        throw new Error('未找到有效的转账或交易记录，请检查文件格式');
                    }

                    return { transferRecords, transactionRecords };
                })
                .then(({ transferRecords, transactionRecords }) => {
                    // Create ZIP file with the categorized CSV files and download it
                    return createAndDownloadZip(transferRecords, transactionRecords, file.name);
                })
                .then(summary => {
                    // Success handling
                    hideLoading();

                    // Reset the file input to allow for uploading the same file again
                    fileInput.value = '';

                    // Show success notification with summary
                    const message = `处理完成！共处理 ${summary.transferCount} 条转账记录和 ${summary.transactionCount} 条交易记录。`;
                    showNotification(message, 'success');
                })
                .catch(error => {
                    // Error handling
                    console.error('Error processing CSV file:', error);
                    hideLoading();

                    // Reset the file input on error
                    fileInput.value = '';

                    // Show error notification
                    showNotification(`处理失败: ${error.message}`, 'error');
                });
        }
    }); // End of DOMContentLoaded listener

})(); // End of IIFE
