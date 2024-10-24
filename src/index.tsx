import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { type FC } from 'hono/jsx';

const app = new Hono();

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

app.get('/', (c) => {
	const messages = ['Good Morning', 'Good Evening', 'Good Night'];
	return c.html(<Top messages={messages} />);
});

const port = 3000;
console.log('📝 Author: Razo');
console.log('🌍 GitHub Repository: https://github.com/iam2r/openai-tools');
console.log(`💖 Don't forget to star the repository if you like this project!`);
console.log();
console.log(`Server is running at http://localhost:${port}`);

serve({
	fetch: app.fetch,
	port,
});
