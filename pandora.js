require('dotenv').config();
const fs = require('fs');
fs.mkdirSync('./pandora/data', { recursive: true });
fs.mkdirSync('./pandora/sessions', { recursive: true });
const prettyJSON = (data) => JSON.stringify(data, null, 2);
const port = process.env.PORT_PANDORA || 3100;
fs.writeFileSync(
	'./pandora/data/config.json',
	prettyJSON({
		bind: `0.0.0.0:${port}`,
		tls: {
			enabled: false,
			cert_file: '',
			key_file: '',
		},
		timeout: 600,
		proxy_url: '',
		license_id: process.env.LICENSE_ID,
		public_share: false,
		site_password: process.env.ACCESS_CODE,
		setup_password: process.env.ACCESS_CODE,
		server_tokens: true,
		proxy_api_prefix: process.env.PROXY_API_PREFIX || '',
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
	prettyJSON(
		Object.fromEntries(
			(process.env.TOKENS || '').split(' ').map((token) => {
				const [email, password] = token.split(',') || [];
				if (email && password) {
					return [
						email,
						{
							token,
							shared: false,
							show_user_info: false,
							password,
						},
					];
				} else {
					return [
						require('uuid').v4(),
						{
							token,
							shared: false,
							show_user_info: false,
							password: process.env.ACCESS_CODE,
						},
					];
				}
			})
		)
	)
);
