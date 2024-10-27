import { AsyncComponent } from './async-fc/index.js';
import { DemoContext } from './context/index.jsx';
import { zValidator } from '@hono/zod-validator';
import { type FC } from 'hono/jsx';
import { Hono } from 'hono';
import { z } from 'zod';

const demo = new Hono();

const Layout: FC = (props) => {
	return (
		<html>
			<body>{props.children}</body>
		</html>
	);
};

const Top: FC = (props: { messages: string[] }) => {
	return (
		<Layout>
			<h1>Hello Hono!</h1>
			<ul>
				{props.messages.map((message) => {
					return <li>{message}!!</li>;
				})}
			</ul>
		</Layout>
	);
};

demo
	.get(
		'/:name',
		zValidator(
			'param',
			z.object({
				name: z.enum(['context', 'async-fc']),
			}),
		),
		(c) => {
			const { name } = c.req.valid('param');
			switch (name) {
				case 'context':
					return c.html(<DemoContext />);
				case 'async-fc':
					return c.html(<AsyncComponent />);
				default:
					return c.html(<Top messages={['Demo']} />);
			}
		},
	)
	.get('/*', (c) => {
		const messages = ['Good Morning', 'Good Evening', 'Good Night'];
		return c.html(<Top messages={messages} />);
	});

export default demo;
