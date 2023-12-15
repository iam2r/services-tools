require('dotenv').config();
const fs = require('fs');
fs.mkdirSync('./pandora/data', { recursive: true });
fs.mkdirSync('./pandora/sessions', { recursive: true });
fs.writeFileSync(
	'./pandora/data/config.json',
	JSON.stringify({
		bind: '0.0.0.0:8181',
		tls: {
			enabled: false,
			cert_file: '',
			key_file: '',
		},
		timeout: 600,
		proxy_url: '',
		license_id: process.env.LICENSE_ID,
		public_share: false,
		site_password: '',
		setup_password: '',
		server_tokens: true,
		proxy_api_prefix: '',
		isolated_conv_title: '*',
		disable_signup: false,
		auto_conv_arkose: false,
		proxy_file_service: false,
		custom_doh_host: '',
		captcha: {
			provider: '',
			site_key: '',
			site_secret: '',
			site_login: false,
			setup_login: false,
			oai_username: false,
			oai_password: false,
			oai_signup: false,
		},
		whitelist: null,
	})
);

fs.writeFileSync(
	'./pandora/data/tokens.json',
	JSON.stringify(
		Object.fromEntries(
			(process.env.TOKENS || '').split(' ').map((token) => {
				const [email, password] = token.split(',') || [];
				return [
					email,
					{
						token,
						shared: false,
						show_user_info: false,
						password,
					},
				];
			})
		)
	)
);
