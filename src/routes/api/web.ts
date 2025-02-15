import { zValidator } from '@hono/zod-validator';
import { omit } from 'lodash-es';
import { Hono } from 'hono';
import { z } from 'zod';

const web = new Hono();

const manifestSchema = z.object({
	custom_base64_encoded_json: z.string().optional(),
	custom_icon: z
		.string()
		.default('https://placehold.co/{size}/{custom_icon_color}/{custom_icon_text_color}.png?text={short_name}&font={custom_icon_text_font}'),
	custom_icon_text_font: z
		.enum(['oswald', 'lato', 'lora', 'montserrat', 'open-sans', 'playfair-display', 'pt-sans', 'raleway', 'roboto', 'source-sans-pro'])
		.default('oswald'),
	custom_icon_color: z
		.string()
		.regex(/^[0-9a-fA-F]{6}$/)
		.default('EEEEEE'),
	custom_icon_text_color: z
		.string()
		.regex(/^[0-9a-fA-F]{6}$/)
		.default('31343C'),
	name: z.string().default('MyApp'),
	short_name: z.string().optional(),
	start_url: z.string().default('/'),
	theme_color: z
		.string()
		.regex(/^[0-9a-fA-F]{6}$/)
		.default('ffffff'),
	background_color: z
		.string()
		.regex(/^[0-9a-fA-F]{6}$/)
		.default('ffffff'),
	display: z.enum(['standalone', 'fullscreen', 'minimal-ui']).default('standalone'),
});
const serviceWorkerRegisterSchema = z.object({
	path: z.string().default('/serviceWorker.js'),
});
web
	.basePath('/pwa')
	.get('/manifest', zValidator('query', manifestSchema), async (c) => {
		const query = c.req.valid('query');
		const {
			name,
			custom_icon,
			custom_icon_text_font,
			custom_icon_text_color,
			custom_icon_color,
			custom_base64_encoded_json,
			theme_color,
			background_color,
		} = query;
		const short_name = query.short_name || name;
		const parseParams = manifestSchema.parse(query);
		const validatedData = omit(
			parseParams,
			Object.keys(parseParams).filter((key) => /^custom_/.test(key)),
		);
		Object.assign(validatedData, { short_name, theme_color: `#${theme_color}`, background_color: `#${background_color}` });
		try {
			if (custom_icon) {
				const extensionMatch = custom_icon.slice(0, custom_icon.indexOf('?')).match(/\.([a-z]+)$/i);
				const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'svg';
				const mimeTypes = {
					svg: 'image/svg+xml',
					png: 'image/png',
					jpg: 'image/jpeg',
					jpeg: 'image/jpeg',
					webp: 'image/webp',
					avif: 'image/avif',
				};
				const mimeType = mimeTypes[extension as keyof typeof mimeTypes] || mimeTypes.svg;
				Object.assign(validatedData, {
					icons: [57, 60, 72, 76, 114, 120, 144, 152, 180, 192, 512]
						.map((size) => {
							const src = custom_icon
								.replace('{size}', String(size))
								.replace('{short_name}', short_name)
								.replace('{custom_icon_color}', custom_icon_color)
								.replace('{custom_icon_text_color}', custom_icon_text_color)
								.replace('{custom_icon_text_font}', custom_icon_text_font);

							return [
								{
									src,
									sizes: `${size}x${size}`,
									type: mimeType,
								},
								{
									src,
									sizes: `${size}x${size}`,
									type: mimeType,
									purpose: 'maskable any',
								},
							];
						})
						.flat(),
				});
			}
			if (custom_base64_encoded_json) {
				const decodedJSON = Buffer.from(custom_base64_encoded_json, 'base64').toString('utf8');
				const parsedJSON = JSON.parse(decodedJSON);
				Object.assign(validatedData, parsedJSON);
			}
		} catch (error) {}

		return c.json(validatedData);
	})
	.get('/serviceWorkerRegister.js', zValidator('query', serviceWorkerRegisterSchema), async (c) => {
		const query = c.req.valid('query');
		return c.text(`if ('serviceWorker' in navigator) {
  window.addEventListener('DOMContentLoaded', function () {
    navigator.serviceWorker.register('${query.path}').then(function (registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
      const sw = registration.installing || registration.waiting
      if (sw) {
        sw.onstatechange = function() {
          if (sw.state === 'installed') {
            // SW installed.  Reload for SW intercept serving SW-enabled page.
            console.log('ServiceWorker installed reload page');
            window.location.reload();
          }
        }
      }
      registration.update().then(res => {
        console.log('ServiceWorker registration update: ', res);
      });
      window._SW_ENABLED = true
    }, function (err) {
      console.error('ServiceWorker registration failed: ', err);
    });
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      console.log('ServiceWorker controllerchange ');
      window.location.reload(true);
    });
  });
}`);
	});

export default web;
