require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = 3000;

// 使用 CORS 中间件允许跨域请求
app.use(cors());

const openAIHandle = async (req, res, next) => {
	try {
		const { ChatGPTUnofficialProxyAPI } = await import('chatgpt');
		const api = new ChatGPTUnofficialProxyAPI({
			apiReverseProxyUrl: process.env.OPENAI_API_REVERSE_PROXY_URL,
			accessToken: 'accessToken',
			debug: true,
			model: process.env.OPENAI_API_MODEL || 'text-davinci-002-render-sha',
		});
		const response = await api.sendMessage('你好，请问你是什么模型你能做些什么', {
			// conversationId: uuid.v4(),
			// parentMessageId: '',
			onProgress: (partialResponse) => {
				console.log(partialResponse);
			},
		});
		console.log(response.body.messages);
	} catch (error) {
		console.log(error);
		console.log('dddddddddd');
	}
};

app.post('/v1/chat/completions', openAIHandle);
app.get('/v1/chat/completions', openAIHandle);

// 启动服务器
app.listen(port, () => {
	console.log(`Server is running at http://localhost:${port}`);
});
