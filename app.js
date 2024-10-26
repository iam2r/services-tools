import express from 'express';

const app = express();
const port = 5000;
app.get('/', (req, res) => {
	res.status(200).json({ status: 'OK' });
});

app.listen(port, () => {
	console.log('📝 Author: Razo');
	console.log('🌍 GitHub Repository: https://github.com/iam2r/openai-tools');
	console.log(`💖 Don't forget to star the repository if you like this project!`);
	console.log();
	console.log(`Server is running at http://localhost:${port}`);
});
