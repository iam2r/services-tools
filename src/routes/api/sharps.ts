import { fetchImage } from '../../utils/fetch-image.js';
import { Hono } from 'hono';
import sharp from 'sharp';

const sharps = new Hono();

sharps.get('/macos-icon', async (c) => {
	const { url, size } = c.req.query();
	if (!url) {
		return c.json({ error: 'No image URL provided' }, 400);
	}

	try {
		const imageBuffer = await fetchImage(url);
		const resultSize =
			typeof size !== 'undefined'
				? Number(size)
				: await (async () => {
						// 使用 sharp.metadata() 获取图像元数据
						const metadata = await sharp(imageBuffer).metadata();
						const width = metadata.width;
						const height = metadata.height;

						// 返回宽度和高度中较小的值
						return Math.min(width || 0, height || 0);
					})();
		const transparentMargin = 0;
		const innerSize = resultSize - transparentMargin * 2; // 计算内部图像的大小
		const cornerRadius = innerSize / 6;

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
