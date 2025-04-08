document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.querySelector('.sidebar');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
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
    const uploadBtn = document.querySelector('.upload-btn');
    const fileInput = document.getElementById('csv-file-input');
    
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', function() {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                // Handle the CSV file upload
                console.log('Uploaded file:', file.name);
                processCSVFile(file);
            }
        });
    }
    
    // Function to process the uploaded CSV file
    function processCSVFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            try {
                // Get the file content
                const csvContent = event.target.result;
                
                // Process the CSV content
                const processedData = preprocessCSV(csvContent);
                
                // Categorize the records
                const { transferRecords, transactionRecords } = categorizeRecords(processedData);
                
                // Create ZIP file with the categorized CSV files and download it
                createAndDownloadZip(transferRecords, transactionRecords, file.name);
                
            } catch (error) {
                console.error('Error processing CSV file:', error);
                alert('处理文件时出错: ' + error.message);
                
                // Reset the file input on error
                fileInput.value = '';
            }
        };
        
        reader.onerror = function() {
            console.error('Error reading file');
            alert('读取文件时出错');
            
            // Reset the file input on read error
            fileInput.value = '';
        };
        
        reader.readAsText(file);
    }
    
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
    
    // 解析CSV行
    /*
    - CSV转义规则说明
      - CSV转义存在标准规则，但本项目中，由于输入输出对象方完全不参照此规则，所以本项目不遵照标准规则
      - 来源方CSV格式
          - 微信 v8.0.57
              - `,`和`\`不转义
              - `"`转义为`""`
      - 接收方CSV处理规则
          - 一木记账 v2.1.6
              - `,`严格被认定为分隔符，暂时没有找到转义的方式
      - 据此
          - 转义规则
              - 微信
                  - 还原`""`转义
                  - 备注描述中碰到`,`的话，截断`,`后的内容
     */
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
              // 保留反斜杠字符本身
              currentField += char;
              i++;
              
              // 如果反斜杠后面还有字符，也添加它（但不特殊处理）
              if (i < line.length) {
                  currentField += line[i];
                  i++;
              }
          } else if (char === ',' && !inQuotes) {
              // 字段结束
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
                        ""                        // Column 6 - Empty (Remarks)
                    ];
                    
                    // Remove trailing empty fields
                    let lastNonEmptyIndex = reformattedFields.length - 1;
                    while (lastNonEmptyIndex >= 0 && reformattedFields[lastNonEmptyIndex] === "") {
                        lastNonEmptyIndex--;
                    }
                    
                    // Ensure we keep at least 8 fields (index 7) to preserve the comma between remarks and tags
                    const lastFieldToKeep = Math.max(7, lastNonEmptyIndex);
                    
                    // Join fields with commas and preserve quotes if needed
                    const reformattedLine = reformattedFields.slice(0, lastFieldToKeep + 1).map(field => {
                        // If field contains commas or quotes, wrap it in quotes
                        if (field.includes(',') || field.includes('"')) {
                            // Replace any quotes with double quotes for escaping
                            return '"' + field.replace(/"/g, '""') + '"';
                        }
                        return field;
                    }).join(',');
                    
                    transferRecords.push(reformattedLine);
                } else {
                    // If the original line is likely a header or incomplete, add a properly formatted header
                    transferRecords.push("日期,转出账户,转入账户,金额,手续费,备注");
                }
            // This is a transaction record - reformat it according to requirements
            } else if (fields.length > 0) {
              // Create new array with 9 columns according to the specified requirements
              const reformattedFields = [
                  fields[0],                // Column 1 ← Original Column 1
                  fields[4],                // Column 2 ← Original Column 5
                  fields[5],                // Column 3 ← Original Column 6
                  "",                       // Column 4 - Empty
                  "",                       // Column 5 - Empty
                  "账本",                   // Column 6 - Fixed value "账本"
                  // Column 7 ← Original Column 7 with additional rule for "收入" type
                  fields[4] === "收入" && fields[6].includes("/") ? "零钱" : fields[6],
                  // Column 8 ← Original Column 11, but only if it doesn't contain "/"
                  fields[10].includes('/') ? "" : fields[10],
                  ""                        // Column 9 - Empty
              ];

              // Join fields with commas and preserve quotes if needed
              const reformattedLine = reformattedFields.map(field => {
                  // If field contains commas or quotes, wrap it in quotes
                  if (field.includes(',') || field.includes('"')) {
                      // Replace any quotes with double quotes for escaping
                      return '"' + field.replace(/"/g, '""') + '"';
                  }
                  return field;
              }).join(',');
              
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
    
    // Function to create and download a ZIP file
    function createAndDownloadZip(transferRecords, transactionRecords, originalFileName) {
        // Load JSZip library dynamically
        if (typeof JSZip === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = function() {
                createZipAndDownload();
            };
            document.head.appendChild(script);
        } else {
            createZipAndDownload();
        }
        
        function createZipAndDownload() {
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
                
                alert('账单处理完成，已下载ZIP文件');
                
                // Reset the file input to allow for uploading the same file again
                document.getElementById('csv-file-input').value = '';
            }).catch(function(error) {
                console.error('Error creating ZIP:', error);
                alert('创建ZIP文件时出错');
                
                // Reset the file input on error too
                document.getElementById('csv-file-input').value = '';
            });
        }
    }
});
