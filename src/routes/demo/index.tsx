import { Hono } from 'hono';
import { type FC } from 'hono/jsx';
import { DemoContext } from '@/routes/demo/context/index.tsx';
import { AsyncComponent } from '@/routes/demo/async-fc/index.js';

const demo = new Hono();

const Layout: FC = (props) => {
	return (
		<html>
			<body>{props.children}</body>
		</html>
	);
};

const Top: FC<{ messages: string[] }> = (props: { messages: string[] }) => {
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

demo.get('/', (c) => {
	const messages = ['Good Morning', 'Good Evening', 'Good Night'];
	return c.html(<Top messages={messages} />);
});

demo.get('/:name', (c) => {
	const { name } = c.req.param();
	switch (name) {
		case 'context':
			return c.html(<DemoContext />);
		case 'async-fc':
			return c.html(<AsyncComponent />);
		default:
			return c.html(<Top messages={['Demo']} />);
	}
});

export default demo;
