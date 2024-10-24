import type { FC } from 'hono/jsx';
import { createContext, useContext } from 'hono/jsx';

const themes = {
	light: {
		color: '#000000',
		background: '#eeeeee',
	},
	dark: {
		color: '#ffffff',
		background: '#222222',
	},
};

const ThemeContext = createContext(themes.light);

const Button: FC = () => {
	const theme = useContext(ThemeContext);
	return <button style={theme}>Push!</button>;
};

const Toolbar: FC = () => {
	return (
		<div>
			<Button />
		</div>
	);
};

export const DemoContext: FC = () => (
	<div>
		<ThemeContext.Provider value={themes.dark}>
			<Toolbar />
		</ThemeContext.Provider>
	</div>
);
