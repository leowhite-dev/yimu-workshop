/**
 * 处理备注文本 - 清理和格式化CSV中的备注字段
 * @param {string} text - 需要处理的原始文本
 * @returns {string} - 处理后的文本
 */
function processNoteText(text) {
    // 特殊情况处理：空值或占位符
    if (!text || text === "/") return text;
    
    // 单次正则表达式处理所有情况
    return text
        // 去掉两端的引号
        .replace(/^\"(.*)\"$/, '$1')
        // 处理连续引号 "" -> "
        .replace(/""/g, '"')
        // 保留反斜杠转义
        .replace(/\\\\(.)/g, '\\\\$1')
        // 移除末尾多余引号
        .replace(/"$/g, '');
}

/**
 * 改进的CSV行解析函数 - 处理带有逗号和引号的CSV字段
 * @param {string} line - 需要解析的CSV行
 * @returns {string[]} - 解析后的字段数组
 */
function parseCSVLine(line) {
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;
    const len = line.length;

    // 使用状态机模式处理CSV解析
    while (i < len) {
        const char = line[i];

        // 处理引号情况
        if (char === '"') {
            // 检查是否为转义引号 ("")
            if (inQuotes && i + 1 < len && line[i + 1] === '"') {
                currentField += '"';
                i += 2; // 跳过两个引号
            } else {
                // 切换引号状态
                inQuotes = !inQuotes;
                i++;
            }
        } 
        // 处理转义字符
        else if (char === '\\') {
            currentField += char;
            i++;
            // 保留转义后的字符
            if (i < len) {
                currentField += line[i];
                i++;
            }
        } 
        // 处理字段分隔符
        else if (char === ',' && !inQuotes) {
            fields.push(currentField);
            currentField = '';
            i++;
        } 
        // 处理普通字符
        else {
            currentField += char;
            i++;
        }
    }

    // 添加最后一个字段
    fields.push(currentField);
    return fields;
}

/**
 * 提取备注文本 - 从CSV行或字段数组中提取备注信息
 * @param {string} line - 原始CSV行
 * @param {string[]} fields - 已解析的字段数组
 * @returns {string} - 提取并处理后的备注文本
 */
function extractNoteText(line, fields) {
    // 默认空备注
    let noteText = "";
    const originalLine = line.trim();
    
    // 尝试从原始行中直接提取备注
    const extractFromOriginalLine = () => {
        const commentStart = originalLine.indexOf('"转账备注:');
        if (commentStart === -1) return false;
        
        // 可能的结束标记
        const possibleEndMarkers = ['","收入"', '",'];
        let commentEnd = -1;
        
        // 查找第一个匹配的结束标记
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
            return true;
        }
        return false;
    };
    
    // 尝试从字段数组中提取备注
    const extractFromFields = () => {
        // 根据不同格式规则提取备注
        if (fields.length > 1 && fields[1] === "转账" && fields.length > 3) {
            // 转账记录格式：备注在第4列
            noteText = fields.length > 3 ? processNoteText(fields[3]) : "";
        } else if (fields.length > 10) {
            // 其他记录格式：备注在第11列
            noteText = processNoteText(fields[10]);
        }
    };
    
    // 先尝试从原始行提取，如果失败则从字段数组提取
    if (!extractFromOriginalLine()) {
        extractFromFields();
    }
    
    return noteText;
}

/**
 * 处理转入账户 - 从账户字段中提取实际账户名称
 * @param {string} account - 原始账户字段
 * @returns {string} - 处理后的账户名称
 */
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

/**
 * 格式化CSV字段 - 处理特殊字符和引号
 * @param {string} field - 需要格式化的字段
 * @returns {string} - 格式化后的字段
 */
function formatCSVField(field) {
    if (!field || field === "") return field;

    // 如果字段包含逗号或引号，需要用引号包裹并转义内部引号
    if (field.includes(',') || field.includes('"')) {
        return '"' + field.replace(/\"/g, '""') + '"';
    }
    return field;
}
