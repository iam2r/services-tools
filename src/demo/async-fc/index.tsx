export const AsyncComponent = async () => {
	await new Promise((r) => setTimeout(r, 5000)); // sleep 1s
	return <div>Done!</div>;
};
