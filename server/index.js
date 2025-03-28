const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const { analyzePdfWithKimi, BACKUP_API_KEY } = require('./kimiService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 允许跨域请求
app.use(cors());
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// 确保uploads目录存在
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({ storage: storage });

// 存储用户会话
const sessions = {};

// PDF分析端点
app.post('/analyze-pdf', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供PDF文件', errorType: 'NO_FILE' });
    }

    console.log('接收到文件:', req.file.path);
    
    // 创建会话ID
    const sessionId = Date.now().toString();
    
    // 检查是否有初始问题
    const initialQuestion = req.body.initialQuestion ? req.body.initialQuestion.trim() : null;
    
    // 使用修改后的函数处理PDF文件
    try {
      console.log('准备处理PDF和问题...');
      
      // 读取PDF文件为Base64格式
      const fs = require('fs');
      const pdfBase64 = fs.readFileSync(req.file.path, {encoding: 'base64'});
      
      // 准备调用Kimi API
      const axios = require('axios');
      const KIMI_API_KEY = process.env.KIMI_API_KEY || BACKUP_API_KEY;
      
      // 构建发送给Kimi的请求，直接包含PDF文件
      const messages = [
        { 
          role: 'system', 
          content: '你是一个专业的PDF文档分析助手。用户会上传PDF文件，请直接基于文件内容回答问题，不要说"我会阅读"之类的话，因为你已经可以直接看到PDF内容。' 
        }
      ];
      
      // 如果有问题，添加问题消息
      if (initialQuestion) {
        messages.push({ role: 'user', content: initialQuestion });
      } else {
        messages.push({ role: 'user', content: '请分析这个PDF文件的内容并提供摘要' });
      }
      
      console.log('发送PDF文件直接到Kimi API...');
      
      // 调用Kimi API处理PDF
      const response = await axios.post('https://api.moonshot.cn/v1/chat/completions', {
        model: 'moonshot-v1-32k',
        messages: messages,
        files: [
          {
            data: pdfBase64,
            type: 'application/pdf'
          }
        ]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${KIMI_API_KEY}`
        },
        timeout: 60000 // 60秒超时，PDF处理需要更长时间
      });
      
      console.log('成功收到Kimi API响应');
      
      // 提取回答内容
      const kimiResponse = response.data.choices[0].message.content;
      
      // 存储会话信息 - 改进方式，仅保存必要信息
      sessions[sessionId] = {
        fileName: req.file.originalname,
        lastUpdate: Date.now(),
        hasPdfContext: true,
        pdfContent: pdfBase64, // 保存PDF内容以便后续请求使用
        messages: [
          { 
            role: 'system', 
            content: '你是一个专业的PDF文档分析助手。你已经拥有了用户上传的PDF文件内容，请直接基于此内容回答问题。' 
          }
        ]
      };
      
      // 如果有问题，添加用户问题和AI回答到会话历史
      if (initialQuestion) {
        sessions[sessionId].messages.push(
          { role: 'user', content: initialQuestion },
          { role: 'assistant', content: kimiResponse }
        );
        
        // 返回分析结果和会话ID
        res.json({
          result: '已上传PDF文件并分析完成',
          questionReply: kimiResponse,
          sessionId: sessionId
        });
      } else {
        // 没有问题，只返回PDF分析结果
        sessions[sessionId].messages.push(
          { role: 'user', content: '请分析这个PDF文件的内容并提供摘要' },
          { role: 'assistant', content: kimiResponse }
        );
        
        // 返回分析结果和会话ID
        res.json({
          result: kimiResponse,
          sessionId: sessionId
        });
      }
    } catch (error) {
      console.error('处理PDF错误:', error);
      throw error;
    } finally {
      // 处理完成后删除上传的文件
      fs.unlinkSync(req.file.path);
    }
  } catch (error) {
    console.error('PDF分析错误:', error);
    
    // 根据错误信息设置错误类型
    let errorType = 'API_ERROR';
    if (error.message.includes('超时')) {
      errorType = 'TIMEOUT';
    } else if (error.message.includes('API密钥') || error.message.includes('API key')) {
      errorType = 'API_KEY_ERROR';
    }
    
    res.status(500).json({ 
      error: '处理PDF时出错', 
      details: error.message,
      errorType: errorType
    });
    
    // 确保在错误时也删除文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// 修改聊天端点，确保会话中的PDF正确传递
app.post('/chat', express.json(), async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: '缺少消息内容', errorType: 'INVALID_REQUEST' });
    }
    
    let session;
    let newSession = false;
    
    // 检查会话是否存在
    if (!sessionId || !sessions[sessionId]) {
      // 如果没有会话ID或会话不存在，创建新会话
      const newSessionId = Date.now().toString();
      sessions[newSessionId] = {
        fileName: null,
        lastUpdate: Date.now(),
        hasPdfContext: false,
        messages: [
          { role: 'system', content: '你是一个专业的PDF文档分析助手，可以回答关于PDF文件的一般性问题，也可以针对上传的PDF提供详细分析。当用户没有上传PDF文件时，请直接回答他们的问题，不要要求他们上传PDF。' }
        ]
      };
      session = sessions[newSessionId];
      newSession = true;
      console.log('创建新会话:', newSessionId);
    } else {
      session = sessions[sessionId];
      session.lastUpdate = Date.now();
      console.log('使用现有会话:', sessionId, '有PDF上下文:', session.hasPdfContext);
    }
    
    console.log(`处理聊天消息, 会话ID: ${sessionId || '新会话'}, 是否有PDF上下文: ${session.hasPdfContext}`);
    console.log('用户问题:', message);
    
    // 添加用户消息
    session.messages.push({ role: 'user', content: message });
    
    // 准备发送到Kimi API的消息
    const chatMessages = session.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    console.log('发送给Kimi的消息数量:', chatMessages.length);
    console.log('系统消息:', chatMessages[0].content);
    
    // 调用Kimi API获取回答
    const axios = require('axios');
    const KIMI_API_KEY = process.env.KIMI_API_KEY || BACKUP_API_KEY;
    
    console.log('发送聊天请求到Kimi API...');
    
    // 构建请求选项
    const requestOptions = {
      model: 'moonshot-v1-32k',
      messages: chatMessages
    };
    
    // 如果会话有PDF内容，添加到请求中
    if (session.hasPdfContext && session.pdfContent) {
      console.log('检测到会话中有PDF内容，添加到请求中');
      requestOptions.files = [
        {
          data: session.pdfContent,
          type: 'application/pdf'
        }
      ];
    }
    
    const response = await axios.post('https://api.moonshot.cn/v1/chat/completions', requestOptions, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`
      },
      timeout: 60000 // 60秒超时
    });
    
    console.log('成功收到Kimi API聊天响应');
    
    // 获取AI回复
    const aiResponse = response.data.choices[0].message.content;
    console.log('Kimi回复:', aiResponse.substring(0, 100) + '...');
    
    // 添加到会话历史
    session.messages.push({ role: 'assistant', content: aiResponse });
    
    // 删除过旧的会话 (1小时)
    const now = Date.now();
    Object.keys(sessions).forEach(key => {
      if (now - sessions[key].lastUpdate > 3600000) {
        delete sessions[key];
      }
    });
    
    // 调试输出
    console.log('会话状态:', {
      id: sessionId || (newSession ? '新会话ID' : '未知'),
      hasPdfContext: session.hasPdfContext,
      messagesCount: session.messages.length
    });
    
    // 返回回复和新会话ID（如果是新会话）
    if (newSession) {
      res.json({ 
        reply: aiResponse,
        sessionId: Object.keys(sessions).find(key => sessions[key] === session)
      });
    } else {
      res.json({ reply: aiResponse });
    }
    
  } catch (error) {
    console.error('聊天对话错误:', error);
    
    // 提供更详细的错误信息
    let errorMessage = '处理对话请求时出错';
    let errorType = 'CHAT_ERROR';
    
    if (error.code === 'ECONNRESET') {
      errorMessage = '连接到Kimi API时被重置，可能是网络问题或API服务不稳定';
      errorType = 'CONNECTION_RESET';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      errorMessage = '连接到Kimi API超时';
      errorType = 'TIMEOUT';
    } else if (error.response) {
      // API返回了错误状态码
      errorMessage = `Kimi API返回错误(${error.response.status}): ${JSON.stringify(error.response.data)}`;
      errorType = 'API_ERROR';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message,
      errorType: errorType
    });
  }
});

app.listen(PORT, () => {
  console.log(`MCP服务器运行在 http://localhost:${PORT}`);
}); 