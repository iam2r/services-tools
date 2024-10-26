// 定义 fetchImage 函数，指定参数和返回值的类型
export async function fetchImage(url: string) {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error('Network response was not ok');
	}

	const buffer = await response.arrayBuffer();
	return buffer;
}
