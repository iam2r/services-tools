interface ServerIpData {
	ip: unknown;
	// Add other properties based on the actual response structure
}

export const getIp = async (): Promise<ServerIpData> => {
	try {
		const serverIpResponse = await fetch('http://ip-api.com/json');
		const serverIpData = await serverIpResponse.json();
		return serverIpData;
	} catch (error) {
		throw error;
	}
};
