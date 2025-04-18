// csv-worker.js - Web Worker for CSV processing
// 该文件包含所有CSV处理相关的函数，在后台线程中执行

// 预处理CSV内容
const preprocessCSV = (csvContent) => {
    // 分割内容为行
    let lines = csvContent.split('\n');

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
const formatCSVField = (field) => {
    if (!field || field === "") return field;

    // 如果字段包含逗号或引号，需要用引号包裹并转义内部引号
    if (field.includes(',') || field.includes('"')) {
        return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
}

// 改进的CSV行解析函数，更好地处理带有逗号和引号的备注
const parseCSVLine = (line) => {
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
const processNoteText = (text) => {
    // 特殊情况处理
    if (!text || text === "/") return text;

    // 去掉两端的引号
    if (text.startsWith('"') && text.endsWith('"')) {
        text = text.substring(1, text.length - 1);
    }

    // 使用正则表达式简化处理
    // 1. 处理连续引号 "" -> "
    // 2. 保留反斜杠转义
    // 3. 将英文逗号替换为中文逗号，避免被CSV解析器误认为列分隔符
    return text
        .replace(/""/g, '"')  // 处理连续引号
        .replace(/\\(.)/g, '\\$1')  // 保留转义字符
        .replace(/,/g, '，');  // 将英文逗号替换为中文逗号
}



// 提取备注文本的辅助函数
const extractNoteText = (_, fields) => {
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

// 处理转入账户的函数
const processTransferInAccount = (account) => {
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
const categorizeRecords = (lines) => {
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

            // 根据指定要求创建具有9列的新数组
            const reformattedFields = [
                fields[0],                // 第1列 ← 原始第1列
                incomeType,               // 第2列 ← 收支类型
                amount,                   // 第3列 ← 金额
                "",                       // 第4列 - 空
                "",                       // 第5列 - 空
                "账本",                   // 第6列 - 固定值"账本"
                fields.length > 6 ? fields[6] : "", // 第7列 ← 原始第7列
                // 第8列 ← 处理备注文本并放在这里
                noteText,
                ""                        // 第9列 - 空
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
                    message: '处理CSV文件时出错: ' + error.message
                }
            });
        }
    }
});
