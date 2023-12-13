import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import Authenticator from './openai-authenticator.js';
import cors from 'cors';
import { getIp } from './common';
const port = 3000;
const app = express();
/**
 * cors
 */
app.use(cors());
/**
 * post
 */
app.use(bodyParser.json());

const createServerInfoMiddleware = () => async (req: Request, res: Response, next: NextFunction) => {
	try {
		const serverIpData = await getIp();
		res.setHeader('Content-Type', 'application/json');
		res.send(
			JSON.stringify(
				{
					ip: serverIpData,
					server: 'express',
				},
				null,
				2
			)
		);
	} catch (error) {
		next(error); // 将错误传递给 Express 的错误处理中间件
	}
};

const getTokenHandler = async (req: Request, res: Response, next: NextFunction) => {
	const { email = 'openai001@iamrazo.pro', password = 'Zaq147895..00' } = req.body;
	const authenticator = new Authenticator();
	const token = await authenticator.login(email, password);
	console.log(token);
};

/**
 * 返回ip信息
 */
app.use('/', createServerInfoMiddleware());

app.post('/api/get-token', getTokenHandler);
app.get('/api/get-token', getTokenHandler);

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error(err);
	res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
	console.log(`http://localhost:${port}`);
});
