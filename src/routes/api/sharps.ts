import { Hono } from 'hono';
import sharp from 'sharp';
import { fetchImage } from '@/utils/fetch-image.ts';

const sharps = new Hono();

sharps.get('/macos-icon', async (c) => {
	const { url, size = 512 } = c.req.query();
	if (!url) {
		return c.json({ error: 'No image URL provided' }, 400);
	}
	const resultSize = Number(size);
	const transparentMargin = Math.floor(resultSize / 6);
	const cornerRadius = transparentMargin * 2;
	const innerSize = resultSize - transparentMargin; // 计算内部图像的大小
	try {
		const imageBuffer = await fetchImage(url);
		const mask = await sharp({
			create: {
				width: innerSize,
				height: innerSize,
				channels: 4,
				background: { r: 0, g: 0, b: 0, alpha: 1 },
			},
		})
			.png()
			.composite([
				{
					input: Buffer.from(`
				  <svg width="${innerSize}" height="${innerSize}">
					<rect x="0" y="0" width="${innerSize}" height="${innerSize}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
				  </svg>`),
					blend: 'dest-in',
				},
			])
			.toBuffer();
		const processedImage = await sharp(imageBuffer)
			.resize(innerSize, innerSize, { fit: 'contain' })
			.extend({
				top: transparentMargin,
				bottom: transparentMargin,
				left: transparentMargin,
				right: transparentMargin,
				background: { r: 255, g: 255, b: 255, alpha: 0 }, // 透明背景
			})
			.composite([{ input: mask, blend: 'dest-in' }]) // 应用圆角遮罩
			.toBuffer();

		return c.body(processedImage, 200, {
			'Content-Type': 'image/png',
		});
	} catch (error) {
		console.error(error);
		return c.json({ error: 'Failed to process image' }, 500);
	}
});

export default sharps;
