import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { omit } from 'lodash-es';

const web = new Hono();

const manifestSchema = z.object({
	base64EncodedJSON: z.string().optional(),
	icon: z.string().default('https://placehold.co/{size}/EEE/31343C?text={short_name}&font=oswald'),
	name: z.string().default('{name}'),
	short_name: z.string().default('{name}'),
	start_url: z.string().default('/'),
	theme_color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.default('#ffffff'),
	background_color: z
		.string()
		.regex(/^#[0-9a-fA-F]{6}$/)
		.default('#ffffff'),
	display: z.enum(['standalone', 'fullscreen', 'minimal-ui']).default('standalone'),
});
const serviceWorkerRegisterSchema = z.object({
	path: z.string().default('/serviceWorker.js'),
});
web
	.basePath('/pwa')
	.get('/manifest', zValidator('query', manifestSchema), async (c) => {
		const query = c.req.valid('query');
		const name = query.name.replace('{name}', 'MyApp');
		const short_name = query.short_name.replace('{name}', name);
		const validatedData = omit(manifestSchema.parse(query), ['base64EncodedJSON', 'icon']);
		Object.assign(validatedData, {
			name,
			short_name,
		});
		try {
			if (query.icon) {
				Object.assign(validatedData, {
					icons: [192, 512, 1024].map((size) => {
						return {
							src: query.icon.replace('{size}', String(size)).replace('{short_name}', short_name),
							sizes: `${size}x${size}`,
							type: 'image/png',
						};
					}),
				});
			}
			if (query.base64EncodedJSON) {
				const decodedJSON = Buffer.from(query.base64EncodedJSON, 'base64').toString('utf8');
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
