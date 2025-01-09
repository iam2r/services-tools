import cron, { type ScheduledTask } from 'node-cron';

export const scheduleTasks = () => {
	if (!process.env.KEEP_ALIVE_URLS) return;
	const urls = (process.env.KEEP_ALIVE_URLS || '').split(',');
	if (urls.length) {
		let job: ScheduledTask | null = null;

		const scheduleJob = () => {
			if (job) {
				job.stop(); // 停止上一次的 cron 任务
			}
			const cronString = `* * * * *`;
			console.log(`${process.env.KEEP_ALIVE_URLS} is keepalive with ${cronString}!`);
			job = cron.schedule(cronString, () => {
				Promise.all(
					urls.map((url) =>
						fetch(url).catch((error) => {
							console.error(`Error sending keep-alive request for ${url}: ${error.message}`);
						}),
					),
				).then((responses) => {
					responses.forEach((response, index) => {
						if (!response?.ok) {
							console.error(`Error: ${response?.status} for ${urls[index]}`);
						}
					});
					console.log('Keep-alive requests sent successfully');
				});
			});

			job.start();

			// 每小时重新创建任务
			setTimeout(scheduleJob, 60 * 60 * 1000); // 1 小时后重新创建任务
		};

		scheduleJob();
	}
};
