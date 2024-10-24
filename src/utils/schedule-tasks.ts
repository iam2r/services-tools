import cron, { type ScheduledTask } from 'node-cron';
export const scheduleTasks = () => {
	if (!process.env.KEEP_ALIVE_URLS) return;
	const urls = (process.env.KEEP_ALIVE_URLS || '').split(',');
	if (urls.length) {
		let job: ScheduledTask | null = null;

		// 每小时重新生成随机时间并创建新的 cron 任务
		const scheduleJob = () => {
			if (job) {
				job.stop(); // 停止上一次的 cron 任务
			}

			const now = new Date();
			const currentMinute = now.getMinutes();
			let randomMinute = Math.floor(Math.random() * 60);

			// 如果生成的随机分钟数已经过去，则将其设置为下一分钟
			if (randomMinute <= currentMinute) {
				randomMinute = (currentMinute + 1) % 60;
			}
			const cronString = `${randomMinute} * * * *`; // 每小时的随机分钟执行
			console.log(`${process.env.KEEP_ALIVE_URLS} is keepalive with ${cronString}!`);
			job = cron.schedule(cronString, () => {
				Promise.all(
					urls.map((url) =>
						fetch(url).catch(() => {
							console.error(`Error sending keep-alive request for ${url}!`);
						})
					)
				).then(() => console.log('Keep-alive requests sent successfully'));
			});

			job.start();

			// 每小时重新创建任务
			setTimeout(scheduleJob, 60 * 60 * 1000); // 1 小时后重新创建任务
		};

		scheduleJob();
	}
};
