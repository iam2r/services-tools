(function (context) {
	const replace2AbsolutePath = (url) => url.replace(/^\//, new URL(`/`, window.location.origin).href);

	const setupElement = (tagName, conditions, config = {}) => {
		const selector = Object.entries(conditions)
			.map(([key, value]) => `[${key}="${value}"]`)
			.join('');

		let tag = document.querySelector(`${tagName}${selector}`);
		if (!tag) {
			tag = document.createElement(tagName);
			Object.entries({ ...conditions, ...config }).forEach(([key, value]) => {
				tag.setAttribute(key, value);
			});
			document.head.appendChild(tag);
		} else {
			Object.entries(config).forEach(([key, value]) => {
				tag.setAttribute(key, value);
			});
		}
		return tag;
	};

	const createAppleMeta = (name, icons = []) => {
		setupElement('meta', { name: 'apple-mobile-web-app-capable' }, { content: 'yes' });
		setupElement('meta', { name: 'apple-mobile-web-app-status-bar-style' }, { content: 'default' });

		if (name) {
			setupElement('meta', { name: 'apple-mobile-web-app-title' }, { content: name });
		}
		icons.forEach((icon) => {
			setupElement('link', { rel: 'apple-touch-icon', sizes: icon.sizes }, { href: icon.src });
		});
	};

	const PwaTools = {
		setupManifest(manifestData) {
			['scope', 'start_url'].forEach((key) => {
				if (manifestData[key]) {
					manifestData[key] = replace2AbsolutePath(manifestData[key]);
				}
			});
			manifestData.icons = (manifestData.icons || []).map((it) => {
				it.src = replace2AbsolutePath(it.src);
				return it;
			});
			createAppleMeta(manifestData.name, manifestData.icons);
			const link = document.createElement('link');
			link.rel = 'manifest';
			link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifestData));
			document.head.appendChild(link);
		},
		initManifest(manifestUrl) {
			fetch(manifestUrl)
				.then((response) => {
					if (response.ok) {
						return response.json();
					} else {
						throw new Error('Network response was not ok.');
					}
				})
				.then((data) => {
					PwaTools.setupManifest(data);
				})
				.catch((error) => {
					console.error('There was a problem with the fetch operation:', error);
				});
		},
		registerThemeColor(light = '#f5f5f5', dark = '#1c1c1e') {
			const lightMeta = setupElement('meta', { name: 'theme-color', media: '(prefers-color-scheme: light)' }, { content: light });
			const darkMeta = setupElement('meta', { name: 'theme-color', media: '(prefers-color-scheme: dark)' }, { content: dark });

			document.addEventListener('custom-event:updateThemeColor', (event) => {
				const theme = event.detail;
				if (theme === 'light') {
					lightMeta.setAttribute('content', light);
					darkMeta.setAttribute('content', light);
				} else if (theme === 'dark') {
					lightMeta.setAttribute('content', dark);
					darkMeta.setAttribute('content', dark);
				} else {
					lightMeta.setAttribute('content', light);
					darkMeta.setAttribute('content', dark);
				}
			});
		},
		triggerThemeUpdate(theme) {
			const event = new CustomEvent('custom-event:updateThemeColor', { detail: theme });
			document.dispatchEvent(event);
		},
	};

	// Check if the environment is a browser
	if (typeof window !== 'undefined') {
		context.PwaTools = PwaTools;
	}

	// CommonJS export
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = PwaTools;
	}

	// ES Module export
	if (typeof define === 'function' && define.amd) {
		define([], () => PwaTools);
	} else if (typeof exports === 'object') {
		exports.PwaTools = PwaTools;
	}
})(typeof window !== 'undefined' ? window : global);
