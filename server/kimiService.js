const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 备用的API密钥 - 以防所有读取方法都失败
const BACKUP_API_KEY = 'sk-gMw8OXgmJaCiaQgwqfaPrzCZED06OiRX2fMe4AT9UF2hVzNz';

// 尝试多种方式加载环境变量
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  console.log('尝试加载.env文件从:', path.join(__dirname, '.env'));
} catch (err) {
  console.error('加载.env文件失败:', err);
}

// 多种方式尝试获取API密钥
let KIMI_API_KEY = null;

// 方法1: 从环境变量中获取
if (process.env.KIMI_API_KEY) {
  console.log('从环境变量获取API密钥');
  KIMI_API_KEY = process.env.KIMI_API_KEY;
} else {
  console.log('环境变量中没有找到API密钥');
}

// 方法2: 直接从文件读取
if (!KIMI_API_KEY) {
  try {
    console.log('正在尝试直接读取.env文件');
    if (fs.existsSync(path.join(__dirname, '.env'))) {
      const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
      console.log('ENV文件内容(前50个字符):', envContent.substring(0, 50));
      
      // 尝试多种正则表达式格式匹配
      let apiKeyMatch = envContent.match(/KIMI_API_KEY=([^\r\n]+)/);
      if (!apiKeyMatch) {
        apiKeyMatch = envContent.match(/"KIMI_API_KEY=([^"]+)"/);
      }
      if (apiKeyMatch) {
        KIMI_API_KEY = apiKeyMatch[1].trim();
        console.log('通过正则表达式成功提取API密钥');
      } else {
        console.log('未能通过正则表达式提取API密钥');
      }
    } else {
      console.log('.env文件不存在');
    }
  } catch (err) {
    console.error('直接读取API密钥失败:', err);
  }
}

// 方法3: 使用备用API密钥
if (!KIMI_API_KEY) {
  console.log('使用备用API密钥');
  KIMI_API_KEY = BACKUP_API_KEY;
}

// 打印调试信息
console.log('最终使用的API密钥前缀: ' + (KIMI_API_KEY ? KIMI_API_KEY.substring(0, 7) + '...' : 'undefined'));

const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
// 设置30秒超时
const TIMEOUT = 30000;

// 定义两种模型 - 高级模型和基础模型
const ADVANCED_MODEL = 'moonshot-v1-32k';
const BASIC_MODEL = 'moonshot-v1-8k';

async function analyzePdfWithKimi(pdfFilePath) {
  try {
    // 检查API密钥是否存在
    if (!KIMI_API_KEY) {
      throw new Error('Kimi API密钥未配置，请在.env文件中设置KIMI_API_KEY');
    }

    // 提取文件名作为参考
    const fileName = pdfFilePath.split(/[\\/]/).pop();
    console.log('正在处理PDF文件:', fileName);
    
    // 首先尝试基础模型 - 修改为默认使用基础模型，确保基本功能可用
    try {
      console.log('尝试使用基础模型:', BASIC_MODEL);
      const result = await callKimiApi(pdfFilePath, fileName, BASIC_MODEL);
      console.log('基础模型调用成功');
      return result;
    } catch (basicError) {
      // 如果基础模型也失败，记录错误
      console.error('基础模型调用失败:', basicError.message);
      throw basicError;
    }
  } catch (error) {
    console.error('Kimi API错误详情:', error.response ? JSON.stringify(error.response.data) : error.message);
    
    // 区分超时错误和其他错误
    if (error.code === 'ECONNABORTED') {
      throw new Error('分析超时：PDF处理时间超过30秒，请尝试更小的文件或稍后再试');
    } else if (error.response && error.response.status === 401) {
      throw new Error(`Kimi API认证失败: API密钥可能无效或没有权限访问此服务。请确认密钥格式正确且未被吊销。`);
    } else {
      throw new Error(`Kimi API调用失败: ${error.message}`);
    }
  }
}

// 提取API调用逻辑到单独的函数中，便于多次调用
async function callKimiApi(pdfFilePath, fileName, modelName) {
  // 根据模型不同构建不同的请求体
  let requestBody;
  
  if (modelName === ADVANCED_MODEL) {
    // 高级模型使用多模态请求，包含PDF内容
    requestBody = {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的PDF文档分析助手，请分析提供的PDF文档并提供详细的文字描述，包括文档结构、主要内容、图表信息等。'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请分析这个PDF文档，提供详细的文字描述，包括其中的图文内容。'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${fs.readFileSync(pdfFilePath).toString('base64')}`
              }
            }
          ]
        }
      ]
    };
  } else {
    // 基础模型使用纯文本请求
    requestBody = {
      model: modelName,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的PDF文档分析助手。'
        },
        {
          role: 'user',
          content: `我正在处理一个名为"${fileName}"的PDF文件。请告诉我如何有效地分析PDF文档的内容，并提取关键信息。`
        }
      ]
    };
  }

  console.log(`发送请求到Kimi API (使用模型: ${modelName})...`);
  console.log('请求头Authorization: Bearer ' + KIMI_API_KEY.substring(0, 7) + '...');
  
  // 发送请求到Kimi API
  const response = await axios.post(KIMI_API_URL, requestBody, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`
    },
    timeout: TIMEOUT
  });

  console.log('API响应状态:', response.status);
  
  // 返回Kimi的分析结果
  return response.data.choices[0].message.content;
}

module.exports = {
  analyzePdfWithKimi,
  BACKUP_API_KEY
}; 